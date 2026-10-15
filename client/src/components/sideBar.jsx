import React, { useState, useEffect } from 'react';
import { logout, menu, home, folders, setting } from '../assets';
import { Link } from 'react-router-dom';

const sideLinks = [
    { id: "home", title: "Home", src: home, path: "/homepage" },
    { id: "folder", title: "Folders", src: folders, path: "/folder" },
    { id: "setting", title: "Setting", src: setting, path: "/setting" },
];

const Sidebar = ({ onToggle, onLogout }) => {
    const [expanded, setExpanded] = useState(false);
     const [authenticated, setAuthenticated] = useState(false);
    useEffect(() => {
        onToggle(expanded); // Notify parent about the state change outside render
    }, [expanded, onToggle]);

    const handleToggle = () => {
        setExpanded(prev => !prev); // Update expanded state
    };

    const handleLogout = () => {
        onLogout(); // Call the onLogout function passed as prop
    };

    return (
        <nav className={`h-screen flex flex-col shadow-xs bg-side transition-all duration-300 ${expanded ? "w-64" : "w-20"} relative z-10`}>
            {/* Menu Item */}
            <div onClick={handleToggle} className="flex items-center p-7 hover:bg-hover hover:rounded-lg relative group cursor-pointer">
                <img src={menu} alt="Menu" className='w-[30px] h-[30px]' />
                <span className={`transition-opacity duration-300 text-white font-poppins font-normal pl-8 ${expanded ? "opacity-100" : "opacity-0"}`}>
                    Menu
                </span>
                {/* Tooltip */}
                {!expanded && (
                    <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-linear-to-r from-purple-500 to-purple-800 text-white text-sm opacity-0 -translate-x-3 invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Menu
                    </div>
                )}
            </div>

            {/* Sidebar Links */}
            <div className='grow'>
                <ul className='flex flex-col p-5 gap-6'>
                    {sideLinks.map((side) => (
                        <li key={side.id} className={`font-poppins font-normal cursor-pointer text-[16px] text-white mb-4 flex items-center hover:bg-hover hover:rounded-lg transition-all duration-300 ${expanded ? "w-full" : "w-16"} relative group`}>
                            <Link to={side.path} className="flex items-center w-full p-2">
                                <img src={side.src} alt={side.title} className='w-[30px] h-[30px] mr-3' />
                                <span className={`transition-opacity duration-300 ${expanded ? "opacity-100 pl-5" : "opacity-0 pl-0"}`}>
                                    {side.title}
                                </span>
                            </Link>
                            {/* Tooltip */}
                            {!expanded && (
                                <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-linear-to-r from-purple-500 to-purple-800 text-white text-sm opacity-0 -translate-x-3 invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                    {side.title}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Logout Item */}
            <div className={`flex items-center p-4 hover:bg-hover hover:rounded-lg relative group cursor-pointer`} onClick={handleLogout}>
                <img src={logout} alt="Logout" className='w-[30px] h-[30px]' />
                <span className={`text-white font-poppins font-normal pl-8 transition-opacity duration-300 ${expanded ? "opacity-100" : "opacity-0"}`}>
                    Logout
                </span>
                {/* Tooltip */}
                {!expanded && (
                    <div className="absolute left-full rounded-md px-2 py-1 ml-6 bg-linear-to-r from-purple-500 to-purple-800 text-white text-sm opacity-0 -translate-x-3 invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        Logout
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Sidebar;
