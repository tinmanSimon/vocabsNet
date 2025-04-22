import aiorwlock

# This is only useful for single server single process implementation.
# FASTAPI gives each worker its own memory space, meaning each process
# will have a different UserLockManager. So if two workers handle the 
# same user's requests at the same time, then we have a race condition.
# Might want to explore distributed lock system if the project needs to 
# scale. 
class UserLockManager:
    def __init__(self):
        self.locks = {}

    async def get_lock(self, username: str):
        if username not in self.locks:
            self.locks[username] = aiorwlock.RWLock()
        return self.locks[username]
