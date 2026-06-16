import asyncpg
import os
import asyncio
from dotenv import load_dotenv
from vertexai.language_models import TextEmbeddingInput, TextEmbeddingModel
from pgvector.asyncpg import register_vector

load_dotenv()  # Load environment variables from .env file

# Configuration
# Note: Use standard postgresql:// for asyncpg
DB_URL = os.getenv("ADK_SESSION_DB_URI") or os.getenv(
    "DATABASE_URL", "postgresql://user:password@localhost:5432/insurance"
)
if "postgresql+asyncpg://" in DB_URL:
    DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")

MODEL_NAME = "gemini-embedding-001"
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generates embeddings for a list of texts using Vertex AI."""
    model = TextEmbeddingModel.from_pretrained(MODEL_NAME)
    inputs: list[str | TextEmbeddingInput] = [
        TextEmbeddingInput(text, "RETRIEVAL_DOCUMENT") for text in texts
    ]
    # get_embeddings is a blocking call, use run_in_executor if needed or just call it directly in this script
    embeddings = model.get_embeddings(inputs, output_dimensionality=768)
    return [embedding.values for embedding in embeddings]


async def ingest_faq():
    if not PROJECT_ID:
        print("Error: GOOGLE_CLOUD_PROJECT environment variable is not set.")
        return

    print(f"Connecting to database: {DB_URL}")
    conn = await asyncpg.connect(DB_URL)
    await register_vector(conn)
    try:
        # 1. Fetch FAQ knowledge
        print("Fetching FAQ knowledge...")
        rows = await conn.fetch("SELECT faq_id, question, answer FROM faq_knowledge")

        if not rows:
            print("No FAQ data found in faq_knowledge table.")
            return

        faq_ids = []
        texts_to_embed = []
        for row in rows:
            faq_ids.append(row["faq_id"])
            # Combine question and answer for better semantic representation
            texts_to_embed.append(
                f"Question: {row['question']}\nAnswer: {row['answer']}"
            )

        # 2. Generate embeddings
        print(
            f"Generating embeddings for {len(texts_to_embed)} items using {MODEL_NAME}..."
        )
        try:
            embeddings = await get_embeddings(texts_to_embed)
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return

        # 3. Insert into vec_faq_knowledge
        print("Inserting embeddings into vec_faq_knowledge...")
        # Clear existing embeddings to avoid duplicates if re-running
        await conn.execute("DELETE FROM vec_faq_knowledge")

        for faq_id, embedding in zip(faq_ids, embeddings):
            # pgvector expects a list of floats (as a string or list depending on driver)
            # asyncpg can handle list of floats directly if pgvector is enabled
            await conn.execute(
                "INSERT INTO vec_faq_knowledge (faq_id, embedding) VALUES ($1, $2)",
                faq_id,
                embedding,
            )

        print("Ingestion completed successfully.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(ingest_faq())
