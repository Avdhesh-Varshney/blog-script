import { Link } from "react-router-dom";
import { getDay } from "../common/date";
import { useState } from "react";

const ProjectStats = ({ stats }) => {

    return (
        <div className="flex gap-2 max-lg:mb-6 max-lg:pb-6 border-gray-100 max-lg:border-b">
            {
                Object.keys(stats).map((key, i) => {
                    return !key.includes("parent") ? (
                        <div
                            key={i}
                            className={"flex flex-col items-center w-full h-full justify-center p-4 px-6 " + (i !== 0 ? " border-gray-100 border-l" : "")}
                        >
                            <h1 className="text-xl lg:text-2xl mb-2">
                                {stats[key].toLocaleString()}
                            </h1>
                            <p className="max-lg:text-gray-500 capitalize">
                                {key.split("_")[1]}
                            </p>
                        </div>
                    ) : ""
                })
            }
        </div>
    )
}

const ManagePublishedProjectCard = ({ project }) => {

    let { banner, project_id, title, publishedAt, activity } = project;

    let [showStat, setShowStat] = useState(false);

    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-gray-100 pb-6 items-center">
                <img src={banner} alt="" className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-gray-100 object-cover" />

                <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/project/${project_id}`} className="project-title mb-4 hover:underline">{title}</Link>

                        <p className="line-clamp-1">Published on {getDay(publishedAt)}</p>
                    </div>

                    <div className="flex gap-6 mt-3">
                        <Link to={`/editor/${project_id}`} className="pr-4 py-2 underline">Edit</Link>

                        <button
                            className="lg:hidden pr-4 py-2 underline"
                            onClick={() => setShowStat(preVal => !preVal)}
                        >
                            Stats
                        </button>

                        <button className="pr-4 py-2 underline text-red-500">Delete</button>
                    </div>
                </div>

                <div className="max-lg:hidden">
                    <ProjectStats stats={activity} />
                </div>
            </div>

            {
                showStat ?
                    <div className="lg:hidden">
                        <ProjectStats stats={activity} />
                    </div>
                    : ""
            }
        </>
    )
}

export default ManagePublishedProjectCard;
