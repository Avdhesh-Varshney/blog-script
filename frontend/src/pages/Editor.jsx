import { createContext, useContext, useState } from "react";
import { UserContext } from "../App";
import { Navigate } from "react-router-dom";
import ProjectEditor from "../components/ProjectEditor";
import PublishForm from "../components/PublishForm";

const projectStructure = {
    projectId: `PID-${Date.now().toString(36)}`,
    title: "",
    banner: "",
    projectUrl: "",
    repository: "",
    content: [],
    tags: [],
    des: "",
    author: { personal_info: {} }
}

export const EditorContext = createContext({});

const Editor = () => {

    const [project, setProject] = useState(projectStructure);
    const [editorState, setEditorState] = useState("editor");
    const [textEditor, setTextEditor] = useState({ isReady: false });

    let { userAuth: { access_token } } = useContext(UserContext);
    return (
        <EditorContext.Provider value={{ project, setProject, editorState, setEditorState, textEditor, setTextEditor }}>
            {
                access_token === null ?
                    <Navigate to="/login" /> :
                    editorState === "editor" ?
                        <ProjectEditor /> : <PublishForm />
            }
        </EditorContext.Provider>
    )
}

export default Editor;
