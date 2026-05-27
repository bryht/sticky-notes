use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use uuid::Uuid;
use crate::{AppState, models::{CreateNoteRequest, UpdateNoteRequest}, db};

pub async fn create_note(
    State(state): State<AppState>,
    Json(req): Json<CreateNoteRequest>,
) -> Response {
    // TODO: Extract user_id from auth middleware
    let user_id = Uuid::nil();
    match db::create_note(&state.pool, user_id, req).await {
        Ok(note) => (StatusCode::CREATED, Json(serde_json::to_value(note).unwrap())).into_response(),
        Err(e) => {
            tracing::error!("Failed to create note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to create note"}))).into_response()
        }
    }
}

pub async fn list_notes(
    State(state): State<AppState>,
) -> Response {
    // TODO: Extract user_id from auth middleware
    let user_id = Uuid::nil();
    match db::list_notes(&state.pool, user_id).await {
        Ok(notes) => (StatusCode::OK, Json(notes)).into_response(),
        Err(e) => {
            tracing::error!("Failed to list notes: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to list notes"}))).into_response()
        }
    }
}

pub async fn get_note(
    State(state): State<AppState>,
    Path(note_id): Path<Uuid>,
) -> Response {
    // TODO: Extract user_id from auth middleware
    let user_id = Uuid::nil();
    match db::get_note(&state.pool, user_id, note_id).await {
        Ok(Some(note)) => (StatusCode::OK, Json(note)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Note not found"}))).into_response(),
        Err(e) => {
            tracing::error!("Failed to get note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to get note"}))).into_response()
        }
    }
}

pub async fn update_note(
    State(state): State<AppState>,
    Path(note_id): Path<Uuid>,
    Json(req): Json<UpdateNoteRequest>,
) -> Response {
    // TODO: Extract user_id from auth middleware
    let user_id = Uuid::nil();
    match db::update_note(&state.pool, user_id, note_id, req).await {
        Ok(Some(note)) => (StatusCode::OK, Json(note)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Note not found"}))).into_response(),
        Err(e) => {
            tracing::error!("Failed to update note: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to update note"}))).into_response()
        }
    }
}

pub async fn delete_note(
    State(state): State<AppState>,
    Path(note_id): Path<Uuid>,
) -> Response {
    // TODO: Extract user_id from auth middleware
    let user_id = Uuid::nil();
    match db::delete_note(&state.pool, user_id, note_id).await {
        Ok(true) => StatusCode::NO_CONTENT.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(e) => {
            tracing::error!("Failed to delete note: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR.into_response()
        }
    }
}
