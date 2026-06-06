from fastapi import APIRouter
from pydantic import BaseModel
from backend.database import Database

router = APIRouter()
db = Database()

class InterestItem(BaseModel):
    interest: str
    position: int

@router.get("/")
async def list_interests() -> list[dict]:
    return db.list_interests()

@router.post("/")
async def add_interest(interest_data: InterestItem):
    interest = {
        "interest": interest_data.interest
    }
    
    db.add_interest(interest, interest_data.position)
    return {"message": f"Interest '{interest_data.interest}' added."}

@router.delete("/{position}")
async def remove_interest(position: int):
    db.remove_interest(position)
    return {"message": f"Interest at position {position} removed."}
