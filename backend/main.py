import logging
import os
from contextlib import asynccontextmanager
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics, coaching, lessons

load_dotenv()


def _configure_logging() -> None:
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    _configure_logging()
    logging.getLogger(__name__).info("Starting SecondHand API")
    yield
    logging.getLogger(__name__).info("Shutting down SecondHand API")


app = FastAPI(
    title="SecondHand API",
    version="1.0.0",
    description="Backend for real-time AR skill coaching (McHacks 13)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(lessons.router)
app.include_router(coaching.router)
app.include_router(analytics.router)


@app.get("/health", tags=["system"])
async def health() -> Dict[str, Any]:
    return {"status": "ok"}
