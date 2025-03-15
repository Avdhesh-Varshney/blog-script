import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/Loader";
import { getDay } from "../common/date";
import ProjectInteraction from "../components/ProjectInteraction";
import ProjectPostCard from "../components/ProjectPostCard";
import ProjectContent from "../components/ProjectContent";

export const projectStructure = {
    title: '',
    des: '',
    content: [],
    author: { personal_info: {} },
    banner: '',
    publishedAt: '',
}

export const ProjectContext = createContext({});

const ProjectPage = () => {

    let { project_id } = useParams();

    const [project, setProject] = useState(projectStructure);
    const [similarProjects, setSimilarProjects] = useState(null);
    const [loading, setLoading] = useState(true);

    let { title, content, banner, author: { personal_info: { fullname, username: author_username, profile_img } }, publishedAt } = project;

    const fetchProject = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/project/get", { project_id })
            .then(({ data: { project } }) => {

                axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/api/project/search", { tag: project.tags[0], limit: 6, elminate_project: project_id })
                    .then(({ data }) => {
                        setSimilarProjects(data.projects);
                    })
                    .catch(err => {
                        console.log(err);
                    })

                setProject(project);
                setLoading(false);
            })
            .catch(err => {
                console.log(err);
                setLoading(false);
            })
    }

    useEffect(() => {
        resetStates();
        fetchProject();
    }, [project_id]);

    const resetStates = () => {
        setProject(projectStructure);
        setSimilarProjects(null);
        setLoading(true);
    }

    return (
        <AnimationWrapper>
            {
                loading ? <Loader /> :
                    <ProjectContext.Provider value={{ project, setProject }}>
                        <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
                            <img src={banner} alt="" className="aspect-video" />
                            <div className="mt-12">
                                <h2>{title}</h2>

                                <div className="flex max-sm:flex-col justify-between my-8">
                                    <div className="flex gap-5 items-start">
                                        <img src={profile_img} alt="" className="w-12 h-12 rounded-full" />
                                        <p className="capitalize">
                                            {fullname}
                                            <br />
                                            @
                                            <Link to={`/user/${author_username}`} className="underline">{author_username}</Link>
                                        </p>
                                    </div>

                                    <p className="text-gray-700 opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5">Published on {getDay(publishedAt)}</p>
                                </div>
                            </div>

                            <ProjectInteraction />

                            <div className="my-12 font-gelasio project-page-content">
                                {
                                    content[0].blocks.map((block, i) => {
                                        return (
                                            <div key={i} className="my-4 md:my-8">
                                                <ProjectContent block={block} />
                                            </div>
                                        )
                                    })
                                }
                            </div>

                            <ProjectInteraction />

                            {
                                similarProjects && similarProjects.length ?
                                    <>
                                        <h1 className="text-2xl mt-14 mb-10 font-medium">Similar Projects</h1>
                                        {
                                            similarProjects.map((project, i) => {
                                                let { author: { personal_info } } = project;

                                                return (
                                                    <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.08 }}>
                                                        <ProjectPostCard content={project} author={personal_info} />
                                                    </AnimationWrapper>
                                                )
                                            })
                                        }
                                    </>
                                    : ""
                            }

                        </div>
                    </ProjectContext.Provider>
            }
        </AnimationWrapper>
    )
}

export default ProjectPage;
