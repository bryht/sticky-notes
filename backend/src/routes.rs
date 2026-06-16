use axum::{
    extract::{Extension, Path, State, Query},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;
use crate::{
    AppState,
    auth,
    db,
    models::{CreateNoteRequest, UpdateNoteRequest, RegisterRequest, RegisterResponse, ErrorResponse},
};

#[derive(Deserialize)]
pub struct ListNotesParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

pub async fn health() -> Response {
    (StatusCode::OK, Json(serde_json::json!({"status": "ok"}))).into_response()
}

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Response {
    if let Err(e) = req.validate() {
        return (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: e })).into_response();
    }

    let api_key_hash = match auth::hash_api_key(&req.api_key) {
        Ok(h) => h,
        Err(e) => {
            tracing::error!("Failed to hash API key: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Registration failed".to_string() })).into_response();
        }
    };

    match db::user_exists_by_hash(&state.pool, &api_key_hash).await {
        Ok(true) => {
            return (StatusCode::CONFLICT, Json(ErrorResponse { error: "Account already exists for this API key".to_string() })).into_response();
        }
        Err(e) => {
            tracing::error!("Failed to check user existence: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Registration failed".to_string() })).into_response();
        }
        Ok(false) => {}
    }

    match db::create_user(&state.pool, &api_key_hash).await {
        Ok(_user_id) => {
            (StatusCode::CREATED, Json(RegisterResponse { message: "Account created successfully".to_string() })).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to create user: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Registration failed".to_string() })).into_response()
        }
    }
}

pub async fn create_note(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(req): Json<CreateNoteRequest>,
) -> Response {
    if let Err(e) = req.validate() {
        return (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: e })).into_response();
    }

    match db::create_note(&state.pool, user_id, req).await {
        Ok(note) => (StatusCode::CREATED, Json(note)).into_response(),
        Err(e) => {
            tracing::error!("Failed to create note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to create note".to_string() })).into_response()
        }
    }
}

pub async fn list_notes(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Query(params): Query<ListNotesParams>,
) -> Response {
    let limit = params.limit.unwrap_or(1000).min(1000);
    let offset = params.offset.unwrap_or(0);

    match db::list_notes(&state.pool, user_id, limit, offset).await {
        Ok(notes) => (StatusCode::OK, Json(notes)).into_response(),
        Err(e) => {
            tracing::error!("Failed to list notes: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to list notes".to_string() })).into_response()
        }
    }
}

pub async fn get_note(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(note_id): Path<Uuid>,
) -> Response {
    match db::get_note(&state.pool, user_id, note_id).await {
        Ok(Some(note)) => (StatusCode::OK, Json(note)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Note not found".to_string() })).into_response(),
        Err(e) => {
            tracing::error!("Failed to get note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to get note".to_string() })).into_response()
        }
    }
}

pub async fn update_note(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(note_id): Path<Uuid>,
    Json(req): Json<UpdateNoteRequest>,
) -> Response {
    if let Err(e) = req.validate() {
        return (StatusCode::BAD_REQUEST, Json(ErrorResponse { error: e })).into_response();
    }

    match db::update_note(&state.pool, user_id, note_id, req).await {
        Ok(Some(note)) => (StatusCode::OK, Json(note)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Note not found".to_string() })).into_response(),
        Err(e) => {
            tracing::error!("Failed to update note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to update note".to_string() })).into_response()
        }
    }
}

pub async fn delete_note(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Path(note_id): Path<Uuid>,
) -> Response {
    match db::delete_note(&state.pool, user_id, note_id).await {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(ErrorResponse { error: "Note not found".to_string() })).into_response(),
        Err(e) => {
            tracing::error!("Failed to delete note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Failed to delete note".to_string() })).into_response()
        }
    }
}
