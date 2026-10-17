# Official image resolved on 2026-10-18. Record actual model digest after pull.
FROM ollama/ollama@sha256:265409e1d931028a8f7d5a32bcbafddd7bffbc6cc629d77efe9560adf692a5e7

COPY deploy/ollama/start.sh /usr/local/bin/gerai-kita-ollama-start
ENV OLLAMA_HOST=[::]:11434 OLLAMA_MODELS=/root/.ollama/models \
    OLLAMA_MODEL=qwen2.5:1.5b OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1
ENTRYPOINT ["/bin/sh", "/usr/local/bin/gerai-kita-ollama-start"]
CMD []
