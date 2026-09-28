import React, { useState } from 'react';
import { data_pic } from '../assets'; // Removed backgroundImage
import Sidebar from '../components/sideBar';
import Navbar from '../components/Navbar';

const AboutUs = ({ onLogout }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const handleToggleSidebar = (expanded) => {
    setSidebarExpanded(expanded);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${sidebarExpanded ? 'w-64' : 'w-20'}`}>
        <Sidebar onToggle={handleToggleSidebar} expanded={sidebarExpanded} onLogout={onLogout} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Navbar */}
        <div
          className={`fixed top-0 left-0 w-full z-10 bg-primary shadow-md transition-all duration-300 ${
            sidebarExpanded ? 'ml-64' : 'ml-20'
          }`}
          style={{ width: `calc(100% - ${sidebarExpanded ? '16rem' : '5rem'})` }}
        >
          <Navbar />
        </div>

        {/* Page Content */}
        <main className="flex-1 pt-24 px-6 bg-gradient-to-br from-purple-600 to-pink-500 text-white relative overflow-auto">
          {/* About Us Section */}
          <section className="text-center mb-16 mt-8">
            <h1 className="text-5xl font-extrabold drop-shadow-md">About Us</h1>
            <p className="mt-6 text-lg max-w-3xl mx-auto leading-relaxed">
              At <span className="font-semibold">SecurMask</span>, we are revolutionizing data privacy with advanced tools
              for masking, encrypting, and anonymizing sensitive data. Your security is our priority.
            </p>
          </section>

          {/* Why Choose Us */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 w-full">
            <div className="bg-white bg-opacity-10 p-8 rounded-lg shadow-xl w-full md:w-1/2">
              <h2 className="text-2xl font-bold mb-2">Why Choose SecurMask?</h2>
              <p className="text-lg leading-relaxed mb-2">
                SecurMask is a cutting-edge platform designed to protect your sensitive data from breaches. With seamless
                masking and unmasking capabilities, we make data security intuitive and accessible.
              </p>
              <p className="text-lg leading-relaxed">
                Our mission is to empower individuals and organizations to handle data responsibly with the highest
                security standards.
              </p>
            </div>

            <div className="flex justify-center items-center md:w-1/3">
              <img
                src={data_pic}
                alt="Data Security"
                className="rounded-lg shadow-2xl hover:scale-105 transition-transform duration-300"
                style={{ width: '350px', height: '350px', objectFit: 'cover' }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AboutUs;









