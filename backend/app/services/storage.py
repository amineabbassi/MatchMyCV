import uuid
from app.database import get_supabase

# In-memory storage fallback
_memory_storage: dict[str, bytes] = {}


async def upload_file(file_bytes: bytes, filename: str, content_type: str = "application/octet-stream") -> str:
    """Upload file to storage and return URL."""
    file_id = f"{uuid.uuid4()}/{filename}"
    
    supabase = get_supabase()
    if supabase:
        try:
            supabase.storage.from_("cv-files").upload(
                file_id,
                file_bytes,
                {"content-type": content_type}
            )
            # Get public URL
            url = supabase.storage.from_("cv-files").get_public_url(file_id)
            return url
        except Exception as e:
            print(f"Supabase storage error: {e}")
            # Fall back to memory
            _memory_storage[file_id] = file_bytes
            return f"memory://{file_id}"
    
    # Memory storage fallback
    _memory_storage[file_id] = file_bytes
    return f"memory://{file_id}"


async def get_file(file_url: str) -> bytes:
    """Get file from storage."""
    if file_url.startswith("memory://"):
        file_id = file_url.replace("memory://", "")
        return _memory_storage.get(file_id, b"")
    
    supabase = get_supabase()
    if supabase and "supabase" in file_url:
        try:
            # Extract path from URL
            path = file_url.split("/cv-files/")[-1]
            response = supabase.storage.from_("cv-files").download(path)
            return response
        except Exception as e:
            print(f"Error downloading file: {e}")
            return b""
    
    return b""


async def delete_file(file_url: str) -> bool:
    """Delete file from storage."""
    if file_url.startswith("memory://"):
        file_id = file_url.replace("memory://", "")
        if file_id in _memory_storage:
            del _memory_storage[file_id]
        return True
    
    supabase = get_supabase()
    if supabase and "supabase" in file_url:
        try:
            path = file_url.split("/cv-files/")[-1]
            supabase.storage.from_("cv-files").remove([path])
            return True
        except:
            pass
    
    return False
