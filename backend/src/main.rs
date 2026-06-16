use axum::{
    routing::{get, post},
    Router,
    middleware,
    extract::DefaultBodyLimit,
    http::HeaderValue,
};
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod, Runtime};
use std::env;
use tokio::signal;
use tokio_postgres::NoTls;
use tower_http::cors::{CorsLayer, Any};

mod auth;
mod db;
mod models;
mod routes;

use auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool,
    pub auth_cache: auth::AuthCache,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let port = env::var("PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid number");
    let pool_size: usize = env::var("POOL_SIZE")
        .unwrap_or_else(|_| "16".to_string())
        .parse()
        .expect("POOL_SIZE must be a valid number");
    let allowed_origin = env::var("ALLOWED_ORIGIN")
        .unwrap_or_else(|_| "*".to_string());

    let pg_config: tokio_postgres::Config = database_url.parse().expect("Invalid DATABASE_URL");

    let mgr_config = ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    };
    let mgr = Manager::from_config(pg_config, NoTls, mgr_config);
    let pool = Pool::builder(mgr)
        .max_size(pool_size)
        .runtime(Runtime::Tokio1)
        .build()
        .expect("Failed to create database pool");

    db::run_migrations(&pool).await.expect("Failed to run migrations");

    let state = AppState {
        pool,
        auth_cache: auth::AuthCache::new(1800),
    };

    let cors = if allowed_origin == "*" {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        CorsLayer::new()
            .allow_origin(allowed_origin.parse::<HeaderValue>().expect("Invalid ALLOWED_ORIGIN"))
            .allow_methods(Any)
            .allow_headers(Any)
    };

    let public_routes = Router::new()
        .route("/health", get(routes::health))
        .route("/register", post(routes::register));

    let protected_routes = Router::new()
        .route("/notes", get(routes::list_notes).post(routes::create_note))
        .route("/notes/{id}", get(routes::get_note).put(routes::update_note).delete(routes::delete_note))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind to port");

    tracing::info!("Server listening on port {}", port);
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server failed");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, starting graceful shutdown");
}
