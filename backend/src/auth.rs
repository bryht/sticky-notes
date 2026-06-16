use axum::{
    extract::State,
    http::{header, StatusCode},
    response::IntoResponse,
    middleware::Next,
    extract::Request,
};
use argon2::{
    Argon2,
    password_hash::{SaltString, PasswordHasher},
};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use uuid::Uuid;
use crate::AppState;

const MIN_API_KEY_LEN: usize = 16;
const ARGON2_SALT: &str = "sticky-notes-fixed-salt-v1";

#[derive(Clone)]
pub struct AuthCache {
    inner: Arc<RwLock<HashMap<String, (Uuid, Instant)>>>,
    ttl: Duration,
}

impl AuthCache {
    pub fn new(ttl_seconds: u64) -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
            ttl: Duration::from_secs(ttl_seconds),
        }
    }

    fn get(&self, key: &str) -> Option<Uuid> {
        let cache = self.inner.read().ok()?;
        cache.get(key).and_then(|(user_id, ts)| {
            if ts.elapsed() < self.ttl {
                Some(*user_id)
            } else {
                None
            }
        })
    }

    fn set(&self, key: String, user_id: Uuid) {
        if let Ok(mut cache) = self.inner.write() {
            cache.insert(key, (user_id, Instant::now()));
        }
    }
}

pub fn hash_api_key(api_key: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::encode_b64(ARGON2_SALT.as_bytes())
        .map_err(|_| argon2::password_hash::Error::B64Encoding(argon2::password_hash::errors::B64Error::InvalidLength))?;
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(api_key.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<impl IntoResponse, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let api_key = auth_header
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if api_key.len() < MIN_API_KEY_LEN {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let api_key_hash = hash_api_key(api_key).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if let Some(user_id) = state.auth_cache.get(&api_key_hash) {
        req.extensions_mut().insert(user_id);
        return Ok(next.run(req).await);
    }

    let client = state.pool.get().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let row = client
        .query_opt(
            "SELECT id FROM users WHERE api_key_hash = $1",
            &[&api_key_hash],
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let row = row.ok_or(StatusCode::UNAUTHORIZED)?;
    let user_id: Uuid = row.get(0);

    state.auth_cache.set(api_key_hash, user_id);

    req.extensions_mut().insert(user_id);

    Ok(next.run(req).await)
}
