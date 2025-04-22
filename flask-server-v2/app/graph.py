from typing import Set, List, Optional
from core.vocab_types import Word, Edge


class Graph:
    def __init__(self):
        self.words: Dict[str, Word] = {}

    def add_words(self, words: list[Word]):
        self.words = {word.name: word for word in words}

    def get_all_data(self):
        return {
            "words" : list(self.words.values())
        }

    
