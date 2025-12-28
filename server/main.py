from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import uuid

from mgz.model import parse_match, serialize

app = FastAPI(title="AoE2 Replay Parser API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dictionary mapping game id to game object (to be implemented)
games = {}

@app.get("/")
async def root():
    return {"message": "AoE2 Replay Parser API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/parse")
async def parse_replay(file: UploadFile = File(...)):
    """Parse an .aoe2record file and return game data as JSON."""
    if not file.filename.endswith('.aoe2record'):
        return JSONResponse(
            content={"error": "Invalid file type. Please upload a .aoe2record file."},
            status_code=400
        )
    
    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix='.aoe2record') as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name
        
        try:
            # Parse the replay file using mgz
            with open(tmp_path, 'rb') as f:
                match = parse_match(f)
                parsed_data = serialize(match)
            
            # Generate a new UUID and store the parsed data
            game_id = str(uuid.uuid4())
            games[game_id] = parsed_data
            
            return JSONResponse(content={"game_id": game_id})
        finally:
            # Clean up the temporary file
            os.unlink(tmp_path)
            
    except Exception as e:
        return JSONResponse(
            content={"error": f"Failed to parse replay: {str(e)}"},
            status_code=500
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
