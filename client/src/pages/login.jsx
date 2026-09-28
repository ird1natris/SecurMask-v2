import { apiUrl } from '../utils/api.js';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import styles from '../style';
import { logo, infocircle, loginimage, Vector } from '../assets';
import OtpModal from '../components/OtpModal'; // Import OtpModal component

const Login = ({ onLoginSuccess }) => {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);  // Track loading state
  const [otpModalVisible, setOtpModalVisible] = useState(false); // To control OTP modal visibility
  const [otp, setOtp] = useState(''); // OTP input state
  const [otpError, setOtpError] = useState(''); // OTP error state
  const [timer, setTimer] = useState(60); // Timer state for OTP resend
  const [canResend, setCanResend] = useState(true); // Can resend OTP flag
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);  // Set loading to true before making the login request

    // Field validation logic
    let hasError = false;
    let newErrors = { email: '', password: '' };

    if (!values.email) {
      newErrors.email = 'Email is required';
      hasError = true;
    }
    if (!values.password) {
      newErrors.password = 'Password is required';
      hasError = true;
    }
    if (hasError) {
      setErrors(newErrors);
      setLoading(false); // Stop loading if there are validation errors
      return;
    }

    // Perform login request
    axios.post(apiUrl('/login'), values, { withCredentials: true })
      .then(res => {
        if (res.data.Status === 'Success') {
          setEmail(values.email);
          setOtpModalVisible(true); // Show OTP modal when login is successful
        } else {
          // Handle errors for wrong email or password
          if (res.data.Error.includes('Incorrect password')) {
            alert('Incorrect password. Please try again.');
          } else if (res.data.Error.includes('Email does not exist')) {
            alert('Email not found. Please check your email.');
          } else {
            alert('Login failed. Please try again.');
          }
        }
      })
      .catch(err => {
        if (err.response && err.response.data && err.response.data.Error) {
          alert(err.response.data.Error); // Show error message from backend
        } else {
          alert('An error occurred. Please try again later.'); // Generic error alert
        }
      })
      .finally(() => setLoading(false)); // Stop loading after the request completes
  };

  // Handle OTP submission
  const handleOtpSubmit = (e) => {
    e.preventDefault();
  
    if (!otp) {
      setOtpError('OTP is required');
      return;
    }
  

    // Send OTP for verification
    axios.post(
      apiUrl('/verify-otp-login'),
      { email, otp },
      { withCredentials: true }
    )
      .then(res => {
        if (res.data.Status === 'Login successful.') {
          // OTP verification success, now navigate to the homepage
          onLoginSuccess(); // Update authentication status
          setValues({ email: '', password: '' }); // Clear the input fields
          // Redirect to homepage or do other tasks here
        } else {
          setOtpError(res.data.Error || 'Invalid OTP. Please try again.');
        }
      })
      .catch(err => {
        console.error('OTP verification error:', err);
        const errorMessage = err.response && err.response.data && err.response.data.Error
          ? err.response.data.Error
          : 'An error occurred while verifying OTP. Please try again later.';
        setOtpError(errorMessage);
      })
      .finally(() => setLoading(false)); // Stop loading after OTP submission
  };
  

  // Handle OTP resend
  const handleResendOtp = () => {
    if (!canResend) return;

    setCanResend(false);
    setTimer(60);

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    axios.post(apiUrl('/resend-otp'), { email: email }, { withCredentials: true })
      .then(res => {
        alert('OTP sent again!');
      })
      .catch(err => {
        console.error('OTP resend error:', err);
        alert('An error occurred while resending OTP.');
      });
  };


  const closeModal = () => {
    setOtpModalVisible(false);
    setOtp("");
    setOtpError("");
  };

  return (
    <section className={`bg-login flex ${styles.paddingY} h-screen w-full`}
      style={{
        backgroundImage: `url(${Vector})`,
        backgroundSize: 'cover', // This makes the background image stretch
        backgroundPosition: 'center', // Centers the background image
        backgroundRepeat: 'no-repeat',
      }}
    >
      <form onSubmit={handleLogin}>
        <div className={`flex-1 flex flex-col xl:px-20 sm:px-20 px-10`}>
          <div className="flex flex-col items-start justify-center p-5 rounded shadow-md w-[386px] h-auto">
            <img src={logo} className="w-[175px] h-[46px] pt-5 mb-4" alt="Logo" />
            <h2 className="text-2xl font-poppins text-white font-semibold mb-6">Welcome</h2>
            <p className="text-[#9695b9] text-lg font-normal font-['Roboto'] leading-[1px] mb-5">
              We are glad to see you back !
            </p>

            <label htmlFor="email" className="text-white text-xs font-normal mb-3">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={values.email}
              onChange={e => setValues({ ...values, email: e.target.value })}
              className={`w-full px-3 py-4 border rounded-md ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}

            <label htmlFor="password" className="text-white text-xs font-normal mb-2 mt-3">Password</label>
            <div className="relative w-full">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'} // Toggle password visibility
                placeholder="••••••••"
                value={values.password}
                onChange={e => setValues({ ...values, password: e.target.value })}
                className={`w-full px-3 py-4 border rounded-md ${
                  errors.password ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            <div className="flex items-center mb-4 mt-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="showPassword" className="text-white text-sm px-1 font-normal font-['Roboto'] cursor-pointer">Show Password</label>
            </div>

            <button
              type="submit"
              className="w-full h-[60px] bg-[#875eff] text-white rounded-[10px] border-2 mb-4 group relative overflow-hidden"
              >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 opacity-0 group-hover:opacity-100 transition duration-300"></span>
              <span className="relative z-10">Sign In</span>
            </button>
            <div className="text-white font-normal font-['Inter'] text-sm hover:underline block mb-4">
              <Link to="/forgot-password">Forgot Password ?</Link>
            </div>

            <p className="text-[#9695b9] text-lg font-normal mb-4">Don’t have an account ?</p>
            <button
              onClick={() => navigate('/register')}
              className="w-full h-[60px] bg-[#875eff] text-white rounded-[10px] border-2 font-bold mb-4 group relative overflow-hidden"
              >
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 opacity-0 group-hover:opacity-100 transition duration-300"></span>
              <span className="relative z-10">Register</span>
            </button>
            <div className="flex items-center text-[#9695b9] mt-4">
            <img
              src={infocircle}
              alt="Info Icon"
              className="mr-2 w-[20px] h-[20px]"
            />
            <a
              href="mailto:unipurpose001@gmail.com?subject=Help%20Request&body=Hello,%20I%20need%20help%20with..."
              className="hover:underline"
            >
            Do you need help ? Contact us.
            </a>
          </div>

          </div>
        </div>
      </form>
      <div className="flex-1 flex items-center justify-center pr-10">
        <img
          src={loginimage}
          alt="loginImage"
          className="w-[696px] h-[784px] hidden sm:block" // This hides the image on smaller screens
        />
      </div>

      {/* Loading message */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-500 bg-opacity-50 flex items-center justify-center ">
          <span className="text-white font-semibold text-xl">Loading...</span>
        </div>
      )}

      {/* OTP Modal */}
      {otpModalVisible && (
        <OtpModal
          otp={otp}
          setOtp={setOtp}
          otpError={otpError}
          handleOtpSubmit={handleOtpSubmit}
          closeModal={closeModal}
          canResend={canResend}
          handleResendOtp={handleResendOtp}
          email={email}
        />
      )}
    </section>
  );
};

export default Login;
