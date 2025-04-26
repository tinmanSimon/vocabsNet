TEST_USERNAME = "najksdfujweqhdjsbhf"
TEST_USERNAME2 = "bweiaofhsadfjd"
TEST_PWD = "pwqaASDFuwe278336"

TEST_WORD_UNIT_1 = {
    "name": "philosophy",
    "username": TEST_USERNAME,
    "notes": "A key concept in ancient Greece"
}

TEST_WORD_UNIT_2 = {
    "name": "stoicism" ,
    "username": TEST_USERNAME,
    "notes": "I practice this daily"
}

TEST_WORD_UNIT_3 = {
    "name": "nihilism" ,
    "username": TEST_USERNAME,
    "star" : True
}

TEST_WORD_UNIT_4 = {
    "name": "existentialism" ,
    "username": TEST_USERNAME
}

TEST_WORD_UNIT_5 = {
    "name": "absurdism" ,
    "username": TEST_USERNAME,
    "belief" : "meaningless and irrational"
}

TEST_EDGE_1_TO_2 = {
    "edge_name": "edge_1_2" ,
    "from_name": "philosophy" ,
    "to_name": "stoicism" ,
    "username": TEST_USERNAME
}

TEST_EDGE_2_TO_1 = {
    "edge_name": "edge_1_2" ,
    "from_name": "stoicism" ,
    "to_name": "philosophy" ,
    "username": TEST_USERNAME
}

TEST_EDGE_1_TO_3 = {
    "edge_name": "edge_1_3" ,
    "from_name": "philosophy" ,
    "to_name": "nihilism" ,
    "username": TEST_USERNAME
}

TEST_EDGE_2_TO_3 = {
    "edge_name": "edge_2_3" ,
    "from_name": "stoicism" ,
    "to_name": "nihilism" ,
    "username": TEST_USERNAME
}

TEST_EDGE_3_TO_4 = {
    "edge_name": "edge_3_4" ,
    "from_name": "nihilism" ,
    "to_name": "existentialism" ,
    "username": TEST_USERNAME
}

TEST_EDGE_5_TO_3 = {
    "edge_name": "edge_5_3" ,
    "from_name": "absurdism" ,
    "to_name": "nihilism" ,
    "username": TEST_USERNAME
}

TEST_DB_EDGE_4_TO_5 = {
    "edge_name": "edge_4_5" ,
    "from_name": "existentialism" ,
    "to_name": "absurdism" ,
    "username": TEST_USERNAME,
    "double_edge": True
}

