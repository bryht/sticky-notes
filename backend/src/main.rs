use axum::{
    routing::{get, post, put, delete},
    Router,
    middleware,
};
use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod, Runtime};
use std::env;
use tokio_postgres::NoTls;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

mod auth;
mod db;
mod models;
mod routes;

use auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub pool: Pool,
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

    // Parse database URL
    let pg_config: tokio_postgres::Config = database_url.parse().expect("Invalid DATABASE_URL");

    let mgr_config = ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    };
    let mgr = Manager::from_config(pg_config, NoTls, mgr_config);
    let pool = Pool::builder(mgr)
        .max_size(16)
        .runtime(Runtime::Tokio1)
        .build()
        .expect("Failed to create database pool");

    // Run migrations
    db::run_migrations(&pool).await.expect("Failed to run migrations");

    let state = AppState { pool };

    let app = Router::new()
        .route("/notes", get(routes::list_notes).post(routes::create_note))
        .route("/notes/{id}", get(routes::get_note).delete(routes::delete_note))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await
        .expect("Failed to bind to port");

    tracing::info!("Server listening on port {}", port);
    axum::serve(listener, app).await.expect("Server failed");
}
