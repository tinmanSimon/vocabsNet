import aiorwlock

class UserLockManager:
    def __init__(self):
        self.locks = {}

    async def get_lock(self, username: str):
        if username not in self.locks:
            self.locks[username] = aiorwlock.RWLock()
        return self.locks[username]
