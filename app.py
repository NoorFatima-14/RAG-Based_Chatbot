import streamlit as st
from rag_engine import load_and_split_pdf, create_vector_store, build_qa_chain

st.set_page_config(page_title="DocChat", page_icon="📄", layout="wide")
st.title("📄 DocChat — Ask Your PDF")
st.caption("Upload any PDF and ask questions in plain English")

with st.sidebar:
    st.header("Upload Document")
    uploaded_file = st.file_uploader("Choose a PDF", type="pdf")
    if uploaded_file:
        with st.spinner("Processing PDF..."):
            chunks = load_and_split_pdf(uploaded_file)
            vector_store = create_vector_store(chunks)
            st.session_state.qa_chain = build_qa_chain(vector_store)
            st.session_state.messages = []
        st.success(f" Ready! {len(chunks)} chunks indexed.")

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

if question := st.chat_input("Ask a question about your document..."):
    if "qa_chain" not in st.session_state:
        st.warning("Please upload a PDF first!")
    else:
        st.session_state.messages.append({"role": "user", "content": question})
        with st.chat_message("user"):
            st.write(question)
        with st.chat_message("assistant"):
           with st.spinner("Searching document..."):
             chain, retriever = st.session_state.qa_chain
             sources = retriever.invoke(question)
        try:
            answer = chain.invoke(question)
        except Exception as e:
            if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                answer = None
                st.error("⚠️ API quota exceeded. Please wait a few minutes and try again, or generate a new API key at aistudio.google.com")
            else:
                answer = None
                st.error(f"Something went wrong: {str(e)}")

    if answer:
        st.write(answer)
        with st.expander("📎 Source pages"):
            for doc in sources:
                page = doc.metadata.get("page", "?")
                st.caption(f"Page {page + 1}: {doc.page_content[:200]}...")

if answer:
    st.session_state.messages.append({"role": "assistant", "content": answer})
