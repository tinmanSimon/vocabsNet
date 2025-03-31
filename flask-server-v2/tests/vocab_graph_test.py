import pytest
from app.vocab_logger import logger
from app.vocab_graph import VocabularyGraph

@pytest.mark.skip(reason="Skip to not corrupt the database")
@pytest.mark.asyncio
async def test_add_word(client):
    VG = VocabularyGraph()
    await VG.add_word({
        "name" : "casdfew",
        "description" : "passion, fire"
    })

