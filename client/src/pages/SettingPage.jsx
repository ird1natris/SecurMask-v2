import { cacheKey } from '../utils/indexedDBUtils';
import React, { useEffect, useState } from "react";
import Sidebar from '../components/sideBar'; // Ensure correct import
import Navbar from '../components/Navbar'; // Ensure correct import
import { people01, backgroundImage } from '../assets';
const SettingsPage = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState("profile");
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [profileImage, setProfileImage] = useState(people01);
    const [userInfo, setUserInfo] = useState({
        name: "",
        email: "",
        phone: "",
        job: "",

    });
    useEffect(() => {
        const savedUserInfo = localStorage.getItem(cacheKey('userInfo'));
        const savedProfileImage = localStorage.getItem(cacheKey('profileImage'));
        if (savedUserInfo) {
            setUserInfo(JSON.parse(savedUserInfo));

        }
        if (savedProfileImage) {
            setProfileImage(savedProfileImage);
        }
    }, []);
    const [isUpdate, setIsUpdate] = useState(false);

    const handleToggleSidebar = (expanded) => {
        setSidebarExpanded(expanded);
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result);
                localStorage.setItem(cacheKey('profileImage'), reader.result);// Set the new image as the profile image
            };
            reader.readAsDataURL(file); // Read the file as a data URL (base64)
        }
    };
    const handleSave = () => {
        setIsUpdate(false);
    }
    const handleUserProfileInput = (e) => {
        const { name, value } = e.target;
        setUserInfo((prev) => {
            const updatedUserInfo = { ...prev, [name]: value };
            localStorage.setItem(cacheKey('userInfo'), JSON.stringify(updatedUserInfo));
            return updatedUserInfo;
        })
    }

    const maskData = (value, type) => {
        if (!value) return "Not set"; // Default if no value exists

        if (type === "email") {
            const [localPart, domain] = value.split("@");
            const maskedLocal = localPart.slice(0, 2) + "*".repeat(Math.max(0, localPart.length - 2));
            return `${maskedLocal}@${domain}`;
        }

        if (type === "phone") {
            return value.replace(/.(?=.{4})/g, "*"); // Mask all except the last 4 digits
        }

        if (type === "name") {
            return value.charAt(0) + "*".repeat(Math.max(0, value.length - 1)); // Show only the first letter
        }

        return value; // For other fields, return as is
    };
    const handleEdit = () => {
        setIsUpdate(true); // Enable edit mode
        setUserInfo({
            name: maskData(userInfo.name, "name"),
            email: maskData(userInfo.email, "email"),
            phone: maskData(userInfo.phone, "phone"),
            job: userInfo.job, // No masking for job
        });
    };



    return (
        <div className="flex h-screen overflow-hidden bg-[#f4f4f4] w-full"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>
            <div className={`transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
                <Sidebar onToggle={handleToggleSidebar} expanded={sidebarExpanded} onLogout={onLogout} />
            </div>
            <div className="flex-1 flex flex-col">
                <div
                    className={`fixed top-0 left-0 w-full z-10 bg-primary transition-all duration-300 ${sidebarExpanded ? 'ml-64' : 'ml-20'}`}
                    style={{ width: `calc(100% - ${sidebarExpanded ? '16rem' : '5rem'})` }}
                >
                    <Navbar />

                </div>
                <div className="justify-center items-center h-[600px] mt-10 bg-white rounded-lg shadow-md mt-40 ml-20 mr-10">
                    <div className="flex">
                        <div className="w-1/4 h-[600px] bg-gray-100 p-4">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "profile"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab("security")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "security"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Security
                            </button>

                            <button
                                onClick={() => setActiveTab("logout")}
                                className={`tab w-full text-left px-4 py-2 font-semibold ${activeTab === "logout"
                                    ? "text-blue-500 border-b-2 border-blue-500"
                                    : "text-gray-600"
                                    }`}
                            >
                                Logout
                            </button>
                        </div>

                        <div className="w-3/4 p-6">
                            {activeTab === "profile" && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Profile</h2>
                                    <div className="flex items-center mb-4">
                                        <img
                                            src={profileImage}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full"
                                        // Trigger file input click
                                        />
                                        <input
                                            type="file"
                                            id="fileInput"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageChange} // Handle file selection
                                        />
                                        <button className="ml-4 px-4 py-2 bg-blue-500 text-white rounded shadow hover:bg-blue-600" onClick={() => document.getElementById("fileInput").click()} >
                                            Change Picture
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                                            {isUpdate ? (
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={userInfo.name}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Name"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.name, "name")}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                            {isUpdate ? (
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={userInfo.email}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Email"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.email, "email")}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                                            {isUpdate ? (
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={userInfo.phone}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Phone"
                                                />
                                            ) : (
                                                <p>{maskData(userInfo.phone, "phone")}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-600 mb-1">Job</label>
                                            {isUpdate ? (
                                                <input
                                                    type="text"
                                                    name="job"
                                                    value={userInfo.job}
                                                    onChange={handleUserProfileInput}
                                                    className="w-full px-3 py-2 border rounded"
                                                    placeholder="Your Job"
                                                />
                                            ) : (
                                                <p>{userInfo.job || "Not set"}</p>
                                            )}
                                        </div>
                                        <div>
                                            {!isUpdate ? (
                                                <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded">
                                                    Edit
                                                </button>
                                            ) : (
                                                <button onClick={handleSave} className="px-4 py-2 bg-green-500 text-white rounded">
                                                    Save
                                                </button>
                                            )}
                                        </div>
                                    </div>


                                </div>
                            )}

                            {activeTab === "security" && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Email sign-in</h2>
                                    <p>Classifile sends a one-time code to your email when you sign in. Codes expire after five minutes.</p>
                                    <p className="mt-4">Your file encryption key is separate. Keep it safe; an email code cannot recover a lost file key.</p>
                                </div>
                            )}

                            {activeTab === "logout" && (
                                <div>
                                    <h2 className="text-xl font-bold mb-4">Logout</h2>
                                    <p className="text-gray-600 mb-4">Are you sure you want to log out?</p>
                                    <button className="px-4 py-2 bg-red-500 text-white rounded shadow hover:bg-red-600 " onClick={() => onLogout()}>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>

    );
};

export default SettingsPage;
