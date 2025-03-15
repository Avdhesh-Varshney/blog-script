import toast, { Toaster } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { EditorContext } from "../pages/Editor";
import Tag from "./Tags";
import axios from "axios";
import { UserContext } from "../App";
import { useNavigate, useParams } from "react-router-dom";

const PublishForm = () => {

    let characterLimit = 200;
    let tagLimit = 10;

    let { project_id } = useParams();

    let { project, project: { banner, projectUrl, repository, title, tags, des, content }, setProject, setEditorState } = useContext(EditorContext);

    let { userAuth: { access_token } } = useContext(UserContext);

    let navigate = useNavigate();

    const handleCloseEvent = () => {
        setEditorState("editor");
    }

    const handleTitleKeyDown = (e) => {
        if (e.keyCode === 13) { // Enter key
            e.preventDefault();
        }
    }

    const handleProjectTitleChange = (e) => {
        let input = e.target;
        setProject({ ...project, title: input.value })
    }

    const handleProjectDesChange = (e) => {
        let input = e.target;
        setProject({ ...project, des: input.value })
    }

    const handleKeyDown = (e) => {
        if (e.keyCode === 13 || e.keyCode === 188) {
            e.preventDefault();
            let tag = e.target.value;

            if (tags.length < tagLimit) {
                if (!tags.includes(tag) && tag.length) {
                    setProject({ ...project, tags: [...tags, tag] });
                }
            } else {
                toast.error(`You can add maximum ${tagLimit} tags`);
            }
            e.target.value = "";
        }
    }

    const publichProject = (e) => {

        if (e.target.className.includes("disable")) {
            return;
        }

        if (!title.length) {
            return toast.error("Write a project title before publishing");
        }

        if (!des.length) {
            return toast.error(`Write a description about your project within ${characterLimit} characters to publish`);
        }

        if (!repository.length) {
            return toast.error("Add a repository URL to publish your project");
        }

        if (!tags.length) {
            return toast.error("Add at least 1 tag to help us to rank your project");
        }

        let loadingToast = toast.loading("Publishing....");

        e.target.classList.add("disable");

        let projectObj = {
            title, des, banner, projectUrl, repository, tags, content, draft: false
        }

        axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/api/project/create`, { ...projectObj, id: project_id }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
            .then(() => {
                e.target.classList.remove("disable");
                toast.dismiss(loadingToast);
                toast.success("Project published successfully");

                setTimeout(() => {
                    navigate("/");
                }, 500);
            })
            .catch(({ response }) => {
                e.target.classList.remove("disable");
                toast.dismiss(loadingToast);
                return toast.error(response.data.error);
            })
    }

    return (
        <AnimationWrapper>
            <section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16 lg:gap-4">
                <Toaster />

                <button className="w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]"
                    onClick={handleCloseEvent}
                >
                    <i className="fi fi-br-cross"></i>
                </button>

                <div className="max-w-[550px] center">
                    <p className="text-dark-grey mb-1"> Preview</p>

                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-200 mt-4">
                        <img src={banner} alt="" />
                    </div>

                    <h1 className="text-4xl font-medium mt-2 leading-tight line-clamp-2">{title}</h1>
                    <p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">{des}</p>
                </div>

                <div className="border-gray-200 lg:border-1 lg:pl-8">
                    <p className="text-dark-grey mb-2 mt-9">Project Title</p>
                    <input type="text" placeholder="Project Title" defaultValue={title} className="input-box pl-4" onChange={handleProjectTitleChange} />

                    <p className="text-dark-grey mb-2 mt-9">Short description about your project</p>

                    <textarea
                        maxLength={characterLimit}
                        defaultValue={des}
                        className="h-40 resize-none leading-7 input-box pl-4"
                        onChange={handleProjectDesChange}
                        onKeyDown={handleTitleKeyDown}
                    >
                    </textarea>

                    <p className="mt-1 text-dark-grey text-sm text-right">{characterLimit - des.length} characters left</p>

                    <p className="text-dark-grey mb-2 mt-9">Topics - (Helps in searching and ranking your project post)</p>

                    <div className="relative input-box pl-2 py-2 pb-4">
                        <input type="text" placeholder="Add topics" className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white" onKeyDown={handleKeyDown} />
                        {
                            tags.map((tag, i) => {
                                return <Tag tag={tag} tagIndex={i} key={i} />
                            })
                        }
                    </div>
                    <p className="mt-1 mb-4 text-dark-grey text-right">{tagLimit - tags.length} Tags left</p>

                    <button className="btn-dark px-8"
                        onClick={publichProject}
                    >Publish</button>
                </div>
            </section>
        </AnimationWrapper>
    )
}

export default PublishForm;
