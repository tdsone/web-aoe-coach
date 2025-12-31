from typing import Optional
from fastapi import FastAPI, File, UploadFile, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tempfile
import os
import uuid
import json
from pathlib import Path

from mgz.model import parse_match, serialize
from game import Game

# Load config files
CONFIG_DIR = Path(__file__).parent / "config"

def load_config(filename: str) -> dict:
    with open(CONFIG_DIR / filename, "r") as f:
        return json.load(f)

GAIA_CONFIG = load_config("gaia.json")
BUILDINGS_CONFIG = load_config("buildings.json")

app = FastAPI(title="AoE2 Replay Parser API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global dictionary mapping game id to game object
games = {}


@app.get("/")
async def root():
    return {"message": "AoE2 Replay Parser API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/parse")
async def parse_replay(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Parse an .aoe2record file and return game data as JSON."""
    if not file.filename.endswith(".aoe2record"):
        return JSONResponse(
            content={"error": "Invalid file type. Please upload a .aoe2record file."},
            status_code=400,
        )

    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(delete=False, suffix=".aoe2record") as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            # Parse the replay file using mgz
            with open(tmp_path, "rb") as f:
                match = parse_match(f)
                parsed_data = serialize(match)

            # INSERT_YOUR_CODE

            # Utility to flatten nested players from any arbitrary structure
            def flatten_players(data):
                """Recursively collect all player dicts, skipping numeric values/lists."""
                players = []
                if isinstance(data, dict):
                    # If it looks like a player (has "number" and "name"), add it
                    if "number" in data and "name" in data:
                        # Avoid messing up the team key, fix inside this dict's team value
                        player_copy = data.copy()
                        if "team" in player_copy:
                            player_copy["team"] = flatten_team(player_copy["team"])
                        players.append(player_copy)
                    else:
                        # recurse into dict values
                        for v in data.values():
                            players.extend(flatten_players(v))
                elif isinstance(data, list):
                    for item in data:
                        players.extend(flatten_players(item))
                return players

            # Utility to flatten team arrays so that all values are just numbers (remove nested players)
            def flatten_team(team):
                res = []
                if isinstance(team, list):
                    for item in team:
                        if isinstance(item, (int, float)):
                            res.append(item)
                        elif isinstance(item, dict):
                            # if this is a player nested in team, just take the number
                            if "number" in item:
                                res.append(item["number"])
                        elif isinstance(item, list):
                            res.extend(flatten_team(item))
                elif isinstance(team, dict):
                    # very unlikely, but just in case, treat as player
                    if "number" in team:
                        res.append(team["number"])
                elif isinstance(team, (int, float)):
                    res.append(team)
                return res

            # Flatten the player structure
            if "players" in parsed_data:
                parsed_data["players"] = flatten_players(parsed_data["players"])


            for player in parsed_data.get("players", []):
                team = player.get("team")
                if isinstance(team, list):
                    for idx, item in enumerate(team):
                        if not isinstance(item, (int, float)):
                            print(f"Non-numeric team item at index {idx}")

            # Generate a new UUID and store the parsed data
            game_id = str(uuid.uuid4())
            game = Game.create_game_from_record(game_id, parsed_data)
            games[game_id] = game

            # Start computing statistics in background
            background_tasks.add_task(game.compute_statistics)

            print(f"Currently {len(games.keys())} in global:")
            print(list(games.keys()))

            # Return game ID along with initial state, map size, and duration
            return JSONResponse(content={
                "id": game_id, 
                "mapSize": game.map_size,
                "duration": game.duration,
                "state": game.get_game_state_json(t=0)
            })
        finally:
            # Clean up the temporary file
            os.unlink(tmp_path)

    except Exception as e:
        return JSONResponse(
            content={"error": f"Failed to parse replay: {str(e)}"}, status_code=500
        )


@app.get("/game/{id}")
async def get_game_state(id: str, t: Optional[float] = Query(None)):
    if id not in games:
        return JSONResponse(content={"error": "Game not found"}, status_code=404)

    game: Game = games[id]
    state = game.get_game_state_json(t)
    return JSONResponse(content=state)


@app.get("/game/{id}/statistics")
async def get_game_statistics(id: str):
    if id not in games:
        return JSONResponse(content={"error": "Game not found"}, status_code=404)

    game: Game = games[id]
    return JSONResponse(content=game.statistics)


@app.get("/game/{id}/metadata")
async def get_game_metadata(id: str):
    if id not in games:
        return JSONResponse(content={"error": "Game not found"}, status_code=404)

    game: Game = games[id]
    return JSONResponse(content=game.get_metadata())


@app.get("/layers/gaia")
async def get_gaia_layer(id: str, t: float = 0):
    if id not in games:
        return JSONResponse(
            content={"error": "Game not found"},
            status_code=404
        )
    
    game = games[id]
    gaia_layer = game.get_gaia(t)
    return JSONResponse(content=[item.to_dict() for item in gaia_layer.items])


@app.get("/layers/buildings")
async def get_buildings_layer(id: str, t: float = 0):
    if id not in games:
        return JSONResponse(
            content={"error": "Game not found"},
            status_code=404
        )
    
    game: Game = games[id]
    buildings_layer = game.get_buildings(t)
    return JSONResponse(content=[item.to_dict() for item in buildings_layer.items])


@app.get("/config/gaia")
async def get_gaia_config():
    """Return gaia display configuration."""
    return JSONResponse(content=GAIA_CONFIG)


@app.get("/config/buildings")
async def get_buildings_config():
    """Return buildings display configuration."""
    return JSONResponse(content=BUILDINGS_CONFIG)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
