# HNBGU RAG Chatbot 
cd backend
npm init -y
npm pkg set type=module
npm install langchain @langchain/core pdf-parse

npm install @langchain/textsplitters @langchain/ollama express dotenv cors helmet pg pgvector
