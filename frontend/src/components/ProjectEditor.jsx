import { useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';
import EditorJS from "@editorjs/editorjs";

import AnimationWrapper from "../common/page-animation";
import { uploadImage } from "../common/cloudinary";
import { EditorContext } from "../pages/Editor";
import { tools } from "./Tools";
import axios from "axios";
import { UserContext } from "../App";

const defaultBanner = "https://res.cloudinary.com/avdhesh-varshney/image/upload/v1741270498/project_banner_wpphwm.png";

const ProjectEditor = () => {

    let { project, project: { projectId, title, banner, repository, projectUrl, content, tags, des }, setProject, textEditor, setTextEditor, setEditorState } = useContext(EditorContext);

    let { userAuth: { access_token } } = useContext(UserContext);

    let navigate = useNavigate();

    const handleCopy = () => {
        navigator.clipboard.writeText(projectId);
        toast.success("Project ID copied to clipboard");
    };

    useEffect(() => {
        if (!textEditor.isReady) {
            setTextEditor(new EditorJS({
                holder: "textEditor",
                data: content,
                tools: tools,
                placeholder: "Let's write an awesome story"
            }));
        }
    }, [])

    const handleBannerUpload = (e) => {
        let img = e.target.files[0];

        if (img) {

            let loadingToast = toast.loading('Uploading...');
            uploadImage(img)
                .then((url) => {
                    if (url) {
                        toast.dismiss(loadingToast);
                        toast.success('Uploaded successfully');
                        setProject({ ...project, banner: url });
                    }
                })
                .catch((err) => {
                    toast.dismiss(loadingToast);
                    return toast.error(err);
                });
        }
    }

    const handleTitleKeyDown = (e) => {
        if (e.keyCode === 13) { // Enter key
            e.preventDefault();
        }
    }

    const handleTitleChange = (e) => {
        let input = e.target;

        input.style.height = 'auto';
        input.style.height = (input.scrollHeight) + 'px';

        setProject({ ...project, title: input.value });
    }

    const handleRepositoryURLChange = (e) => {
        let input = e.target;
        setProject({ ...project, repository: input.value })
    }

    const handleProjectURLChange = (e) => {
        let input = e.target;
        setProject({ ...project, projectUrl: input.value })
    }

    const handlePublishEvent = () => {
        if (!banner.length) {
            return toast.error("Upload a project banner to publish it");
        }
        if (!title.length) {
            return toast.error("Title is required to publish a project");
        }
        if (textEditor.isReady) {
            textEditor.save()
                .then((outputData) => {
                    if (outputData.blocks.length) {
                        setProject({ ...project, content: outputData });
                        setEditorState("publish");
                    } else {
                        return toast.error("Write something in your project to publish it");
                    }
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }

    const handleSaveDraft = (e) => {

        if (e.target.className.includes("disable")) {
            return;
        }

        if (!title.length) {
            return toast.error("Write project title before saving it as a draft");
        }

        if (!repository.length) {
            return toast.error("Add a repository URL before saving it as a draft");
        }

        let loadingToast = toast.loading("Saving Draft....");

        e.target.classList.add("disable");

        if (textEditor.isReady) {
            textEditor.save()
                .then(content => {

                    let projectObj = {
                        title, des, banner, projectUrl, repository, tags, content, draft: true
                    }

                    axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/api/project/create`, projectObj, {
                        headers: {
                            'Authorization': `Bearer ${access_token}`
                        }
                    })
                        .then(() => {
                            e.target.classList.remove("disable");
                            toast.dismiss(loadingToast);
                            toast.success("Project saved successfully");

                            setTimeout(() => {
                                navigate("/");
                            }, 500);
                        })
                        .catch(({ response }) => {
                            e.target.classList.remove("disable");
                            toast.dismiss(loadingToast);
                            return toast.error(response.data.error);
                        })
                })
                .catch((err) => {
                    console.log(err);
                });
        }
    }

    return (
        <>
            <nav className="navbar">
                <Link to="/" className="flex-none w-10">
                    <img src="logo.png" />
                </Link>
                <p className="max-md:hidden text-black line-clamp-1 w-full">
                    {title.length ? title : "New Project"}
                </p>

                <div className="flex gap-4 ml-auto">
                    <button className="btn-dark py-2"
                        onClick={handlePublishEvent}
                    >
                        Publish
                    </button>
                    <button className="btn-light py-2"
                        onClick={handleSaveDraft}
                    >
                        Save Draft
                    </button>
                </div>
            </nav>

            <Toaster />

            <AnimationWrapper>
                <section>
                    <div className="mx-auth max-w-[900px] w-full">
                        <div className="text-sm text-gray-500 mb-4 font-gelasio flex items-center gap-2">
                            <span>Project ID:</span>
                            <span className="font-mono text-gray-700">{projectId}</span>
                            <button
                                className="py-1 px-2 bg-gray-200 hover:bg-gray-300 rounded-md flex items-center justify-center cursor-pointer"
                                onClick={handleCopy}
                            >
                                <i className="fi fi-rr-copy text-sm"></i>
                            </button>
                        </div>

                        <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-gray-200">
                            <label htmlFor="uploadBanner">
                                <img
                                    src={banner ? banner : defaultBanner}
                                    className="z-20"
                                />
                                <input
                                    id="uploadBanner"
                                    type="file"
                                    accept=".png, .jpg, .jpeg"
                                    hidden
                                    onChange={handleBannerUpload}
                                />
                            </label>
                        </div>

                        <textarea
                            defaultValue={title}
                            placeholder="Project Title"
                            className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
                            onKeyDown={handleTitleKeyDown}
                            onChange={handleTitleChange}
                        ></textarea>

                        <div className="flex flex-col md:flex-row gap-4 sm:gap-2 mt-5">
                            <input
                                type="text"
                                placeholder="Repository URL"
                                defaultValue={repository}
                                className="text-xl font-medium w-full md:w-1/2 h-16 md:h-20 outline-none resize-none leading-tight placeholder:opacity-40"
                                onChange={handleRepositoryURLChange}
                            />
                            <input
                                type="text"
                                placeholder="Project Live URL"
                                defaultValue={projectUrl}
                                className="text-xl font-medium w-1/2 h-20 outline-none resize-none leading-tight placeholder:opacity-40"
                                onChange={handleProjectURLChange}
                            />
                        </div>

                        <hr className="w-full opacity-10 my-5" />

                        <div id="textEditor" className="font-gelasio"></div>
                    </div>
                </section>
            </AnimationWrapper>
        </>
    )
}

export default ProjectEditor;
