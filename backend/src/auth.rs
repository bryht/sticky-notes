use axum::{
    extract::State,
    http::{header, StatusCode},
    response::IntoResponse,
    middleware::Next,
    extract::Request,
};
use sha2::{Sha256, Digest};
use uuid::Uuid;
use crate::AppState;

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    // Extract Authorization header
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Parse "Bearer <api-key>"
    let api_key = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    // Hash the API key
    let mut hasher = Sha256::new();
    hasher.update(api_key.as_bytes());
    let api_key_hash = format!("{:x}", hasher.finalize());

    // Look up or create user in database
    let client = state.pool.get().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let row = client
        .query_one(
            "INSERT INTO users (api_key_hash) VALUES ($1)
             ON CONFLICT (api_key_hash) DO UPDATE SET api_key_hash = EXCLUDED.api_key_hash
             RETURNING id, created_at",
            &[&api_key_hash],
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user_id: Uuid = row.get(0);

    // Insert user_id into request extensions
    req.extensions_mut().insert(user_id);

    Ok(next.run(req).await)
}

pub fn hash_api_key(api_key: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(api_key.as_bytes());
    format!("{:x}", hasher.finalize())
}
