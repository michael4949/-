from mnemo.memory.embedding import Embedder, HashingEmbedder


def test_similar_text_scores_higher_than_unrelated():
    emb = HashingEmbedder()
    q = emb.embed("how do I build the project")
    related = emb.embed("the build command is npm run build")
    unrelated = emb.embed("the weather in paris is mild today")
    assert Embedder.cosine(q, related) > Embedder.cosine(q, unrelated)


def test_vectors_are_normalized():
    emb = HashingEmbedder(dim=128)
    v = emb.embed("normalize me please")
    norm = sum(x * x for x in v) ** 0.5
    assert abs(norm - 1.0) < 1e-6


def test_identical_text_is_identical_vector():
    emb = HashingEmbedder()
    assert emb.embed("same thing") == emb.embed("same thing")
