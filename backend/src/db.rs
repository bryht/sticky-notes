use deadpool_postgres::Pool;
use uuid::Uuid;
use crate::models::{Note, CreateNoteRequest, UpdateNoteRequest};

pub async fn run_migrations(pool: &Pool) -> Result<(), Box<dyn std::error::Error>> {
    let client = pool.get().await?;

    // Create users table
    client
        .batch_execute(
            "CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                api_key_hash VARCHAR(64) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );",
        )
        .await?;

    // Create stick_notes_records table
    client
        .batch_execute(
            "CREATE TABLE IF NOT EXISTS stick_notes_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                position JSONB NOT NULL,
                size JSONB NOT NULL,
                color VARCHAR(20) NOT NULL,
                minimized BOOLEAN NOT NULL DEFAULT false,
                url TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );",
        )
        .await?;

    // Create indexes
    client
        .batch_execute(
            "CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_id ON stick_notes_records(user_id);
             CREATE INDEX IF NOT EXISTS idx_stick_notes_records_url ON stick_notes_records(url);",
        )
        .await?;

    Ok(())
}

pub async fn create_note(
    pool: &Pool,
    user_id: Uuid,
    req: CreateNoteRequest,
) -> Result<Note, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client
        .query_one(
            "INSERT INTO stick_notes_records (user_id, content, position, size, color, minimized, url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, user_id, content, position, size, color, minimized, url, created_at, updated_at",
            &[
                &user_id,
                &req.content,
                &req.position,
                &req.size,
                &req.color,
                &req.minimized,
                &req.url,
            ],
        )
        .await?;

    Ok(Note {
        id: row.get(0),
        user_id: row.get(1),
        content: row.get(2),
        position: row.get(3),
        size: row.get(4),
        color: row.get(5),
        minimized: row.get(6),
        url: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    })
}

pub async fn list_notes(pool: &Pool, user_id: Uuid) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let rows = client
        .query(
            "SELECT id, user_id, content, position, size, color, minimized, url, created_at, updated_at
             FROM stick_notes_records
             WHERE user_id = $1
             ORDER BY updated_at DESC",
            &[&user_id],
        )
        .await?;

    Ok(rows
        .into_iter()
        .map(|row| Note {
            id: row.get(0),
            user_id: row.get(1),
            content: row.get(2),
            position: row.get(3),
            size: row.get(4),
            color: row.get(5),
            minimized: row.get(6),
            url: row.get(7),
            created_at: row.get(8),
            updated_at: row.get(9),
        })
        .collect())
}

pub async fn get_note(
    pool: &Pool,
    user_id: Uuid,
    note_id: Uuid,
) -> Result<Option<Note>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client
        .query_opt(
            "SELECT id, user_id, content, position, size, color, minimized, url, created_at, updated_at
             FROM stick_notes_records
             WHERE id = $1 AND user_id = $2",
            &[&note_id, &user_id],
        )
        .await?;

    Ok(row.map(|row| Note {
        id: row.get(0),
        user_id: row.get(1),
        content: row.get(2),
        position: row.get(3),
        size: row.get(4),
        color: row.get(5),
        minimized: row.get(6),
        url: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    }))
}

pub async fn update_note(
    pool: &Pool,
    user_id: Uuid,
    note_id: Uuid,
    req: UpdateNoteRequest,
) -> Result<Option<Note>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn tokio_postgres::types::ToSql + Sync>> = Vec::new();
    let mut param_idx = 1;

    if let Some(content) = req.content {
        updates.push(format!("content = ${}", param_idx));
        params.push(Box::new(content));
        param_idx += 1;
    }
    if let Some(position) = req.position {
        updates.push(format!("position = ${}", param_idx));
        params.push(Box::new(position));
        param_idx += 1;
    }
    if let Some(size) = req.size {
        updates.push(format!("size = ${}", param_idx));
        params.push(Box::new(size));
        param_idx += 1;
    }
    if let Some(color) = req.color {
        updates.push(format!("color = ${}", param_idx));
        params.push(Box::new(color));
        param_idx += 1;
    }
    if let Some(minimized) = req.minimized {
        updates.push(format!("minimized = ${}", param_idx));
        params.push(Box::new(minimized));
        param_idx += 1;
    }
    if let Some(url) = req.url {
        updates.push(format!("url = ${}", param_idx));
        params.push(Box::new(url));
        param_idx += 1;
    }

    if updates.is_empty() {
        return get_note(pool, user_id, note_id).await;
    }

    updates.push("updated_at = NOW()".to_string());

    let query = format!(
        "UPDATE stick_notes_records
         SET {}
         WHERE id = ${} AND user_id = ${}
         RETURNING id, user_id, content, position, size, color, minimized, url, created_at, updated_at",
        updates.join(", "),
        param_idx,
        param_idx + 1
    );

    params.push(Box::new(note_id));
    params.push(Box::new(user_id));

    let param_refs: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> =
        params.iter().map(|p| p.as_ref()).collect();

    let row = client.query_opt(&query, &param_refs).await?;

    Ok(row.map(|row| Note {
        id: row.get(0),
        user_id: row.get(1),
        content: row.get(2),
        position: row.get(3),
        size: row.get(4),
        color: row.get(5),
        minimized: row.get(6),
        url: row.get(7),
        created_at: row.get(8),
        updated_at: row.get(9),
    }))
}

pub async fn delete_note(
    pool: &Pool,
    user_id: Uuid,
    note_id: Uuid,
) -> Result<bool, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let result = client
        .execute(
            "DELETE FROM stick_notes_records WHERE id = $1 AND user_id = $2",
            &[&note_id, &user_id],
        )
        .await?;

    Ok(result > 0)
}
