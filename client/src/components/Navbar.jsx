import { cacheKey } from '../utils/indexedDBUtils';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Import useLocation
import { people01, logo, dots, close } from '../assets';

const navLinks = [
  {
    id: "aboutUs",
    title: "About Us",
    path: "/about-us", // Define path for routing
  },
  {
    id: "contact",
    title: "Contact",
    path: "/contact", // Define path for routing
  },
  {
    id: "profile",
    src: people01,
    path: "/profile", // Define path for routing
  },
];

const Navbar = () => {
  const [toggle, settoggle] = useState(false);
  const [profileImage, setProfileImage] = useState(people01); // Default profile image
  const location = useLocation(); // Get current location

  // Load profile image from localStorage on component mount
  useEffect(() => {
    const storedProfileImage = localStorage.getItem(cacheKey('profileImage'));
    if (storedProfileImage) {
      setProfileImage(storedProfileImage); // Set profile image from localStorage
    }
  }, []);

  return (
    <nav className='w-full flex py-4 justify-between items-center navbar'>
      <Link to="/homepage">
        <img src={logo} alt="SecurMask" className='w-[175px] h-auto ml-10' />
      </Link>

      <ul className='list-none sm:flex hidden justify-end items-center flex-1'>
        {navLinks.map((nav, index) => (
          <li key={nav.id}
            className={`font-poppins font-normal cursor-pointer text-[16px] ${index === navLinks.length - 1 ? 'mr-0' : 'mr-10'} text-white 
              ${location.pathname === nav.path ? 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-transparent bg-clip-text' : 'hover:bg-gradient-to-r hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 hover:text-transparent hover:bg-clip-text'}`}
          >
            <Link to={nav.path}>
              {nav.title && <span>{nav.title}</span>}
            </Link>
            {nav.src && (
              <img
                src={profileImage} // Use the profile image from state (localStorage value)
                alt="profile"
                className='w-14 h-14 rounded-full'
              />
            )}
          </li>
        ))}
      </ul>

      <div className='sm:hidden flex flex-1 justify-end items-center'>
        <img
          src={toggle ? close : dots}
          alt='menu'
          className='w-[25px] h-[25px] object-contain'
          onClick={() => settoggle((prev) => !prev)}
        />

        <div className={`${toggle ? 'flex' : 'hidden'} p-6 bg-gradient-to-r from-gray-700 via-black to-gray-700 absolute top-20 right-0 mx-4 my-2 min-w-[140px] rounded-xl sidebar`}>
          <ul className='list-none flex flex-col justify-end items-center flex-1'>
            {navLinks.map((nav, index) => (
              <li key={nav.id}
                className={`font-poppins font-normal cursor-pointer text-[16px] ${index === navLinks.length - 1 ? 'mr-0' : 'mb-4'} text-white 
                  ${location.pathname === nav.path ? 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-transparent bg-clip-text' : 'hover:bg-gradient-to-r hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 hover:text-transparent hover:bg-clip-text'}`}
              >
                <Link to={nav.path}>
                  {nav.title && <span>{nav.title}</span>}
                </Link>
                {nav.src && (
                  <img
                    src={profileImage} // Use the profile image from state (localStorage value)
                    alt="profile"
                    className='w-14 h-14 rounded-full'
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;