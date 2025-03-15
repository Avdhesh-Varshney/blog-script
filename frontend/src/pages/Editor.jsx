import { createContext, useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { Navigate, useParams } from "react-router-dom";
import ProjectEditor from "../components/ProjectEditor";
import PublishForm from "../components/PublishForm";
import Loader from "../components/Loader";
import axios from "axios";

const projectStructure = {
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

    let { project_id } = useParams();

    const [project, setProject] = useState(projectStructure);
    const [editorState, setEditorState] = useState("editor");
    const [textEditor, setTextEditor] = useState({ isReady: false });
    const [loading, setLoading] = useState(true);

    let { userAuth: { access_token } } = useContext(UserContext);

    useEffect(() => {
        if (!project_id) {
            return setLoading(false);
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/project/get", { project_id, draft: true, mode: 'edit' })
            .then(({ data: { project } }) => {
                setProject(project);
                setLoading(false);
            })
            .catch(err => {
                setProject(null);
                console.log(err);
                setLoading(false);
            })

    }, []);

    return (
        <EditorContext.Provider value={{ project, setProject, editorState, setEditorState, textEditor, setTextEditor }}>
            {
                access_token === null ?
                    <Navigate to="/login" /> :
                    loading ? <Loader /> :
                        editorState === "editor" ?
                            <ProjectEditor /> : <PublishForm />
            }
        </EditorContext.Provider>
    )
}

export default Editor;
