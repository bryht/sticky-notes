use deadpool_postgres::Pool;
use uuid::Uuid;
use crate::models::{Note, CreateNoteRequest, UpdateNoteRequest};

pub async fn run_migrations(pool: &Pool) -> Result<(), Box<dyn std::error::Error>> {
    let client = pool.get().await?;

    client
        .batch_execute(
            "CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                api_key_hash TEXT NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );",
        )
        .await?;

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

    client
        .batch_execute(
            "CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_id ON stick_notes_records(user_id);
             CREATE INDEX IF NOT EXISTS idx_stick_notes_records_user_url ON stick_notes_records(user_id, url);
             CREATE INDEX IF NOT EXISTS idx_stick_notes_records_updated_at ON stick_notes_records(updated_at DESC);",
        )
        .await?;

    Ok(())
}

pub async fn create_user(pool: &Pool, api_key_hash: &str) -> Result<Uuid, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client
        .query_one(
            "INSERT INTO users (api_key_hash) VALUES ($1) RETURNING id",
            &[&api_key_hash],
        )
        .await?;
    Ok(row.get(0))
}

pub async fn user_exists_by_hash(pool: &Pool, api_key_hash: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let row = client
        .query_one(
            "SELECT COUNT(*) FROM users WHERE api_key_hash = $1",
            &[&api_key_hash],
        )
        .await?;
    let count: i64 = row.get(0);
    Ok(count > 0)
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

    Ok(Note::from(row))
}

pub async fn list_notes(
    pool: &Pool,
    user_id: Uuid,
    limit: i64,
    offset: i64,
) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;
    let rows = client
        .query(
            "SELECT id, user_id, content, position, size, color, minimized, url, created_at, updated_at
             FROM stick_notes_records
             WHERE user_id = $1
             ORDER BY updated_at DESC
             LIMIT $2 OFFSET $3",
            &[&user_id, &limit, &offset],
        )
        .await?;

    Ok(rows.into_iter().map(Note::from).collect())
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

    Ok(row.map(Note::from))
}

pub async fn update_note(
    pool: &Pool,
    user_id: Uuid,
    note_id: Uuid,
    req: UpdateNoteRequest,
) -> Result<Option<Note>, Box<dyn std::error::Error>> {
    let client = pool.get().await?;

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn tokio_postgres::types::ToSql + Sync + Send>> = Vec::new();
    let mut param_idx = 1;

    if let Some(content) = req.content {
        updates.push(format!("content = ${}", param_idx));
        values.push(Box::new(content));
        param_idx += 1;
    }
    if let Some(position) = req.position {
        updates.push(format!("position = ${}", param_idx));
        values.push(Box::new(position));
        param_idx += 1;
    }
    if let Some(size) = req.size {
        updates.push(format!("size = ${}", param_idx));
        values.push(Box::new(size));
        param_idx += 1;
    }
    if let Some(color) = req.color {
        updates.push(format!("color = ${}", param_idx));
        values.push(Box::new(color));
        param_idx += 1;
    }
    if let Some(minimized) = req.minimized {
        updates.push(format!("minimized = ${}", param_idx));
        values.push(Box::new(minimized));
        param_idx += 1;
    }
    if let Some(url) = req.url {
        updates.push(format!("url = ${}", param_idx));
        values.push(Box::new(url));
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

    values.push(Box::new(note_id));
    values.push(Box::new(user_id));

    let params: Vec<&(dyn tokio_postgres::types::ToSql + Sync)> =
        values.iter().map(|p| p.as_ref() as &(dyn tokio_postgres::types::ToSql + Sync)).collect();

    let row = client.query_opt(&query, &params).await?;

    Ok(row.map(Note::from))
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
