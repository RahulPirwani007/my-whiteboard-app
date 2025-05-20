import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface FormData {
  username: string;
  email: string;
  password: string;
}

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const isEmailValid = formData.email.endsWith("@gmail.com");
  const isPasswordValid =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/.test(
      formData.password
    );
  const isFormValid = isEmailValid && isPasswordValid;

  const logourl =
    "https://img.freepik.com/premium-vector/vector-design-digital-sketch-icon-style_822882-216870.jpg";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "email") {
      const [usernamePart] = value.split("@");
      setFormData((prev) => ({
        ...prev,
        email: value,
        username: usernamePart,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userData = {
      username: formData.username,
      email: formData.email,
    };

    if (isLogin) {
      console.log("Login with:", {
        email: formData.email,
        password: formData.password,
        username: formData.username,
      });
    } else {
      console.log("Signup with:", formData);
    }

    navigate("/whiteboard", { state: userData });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200">
      <div className="flex flex-col justify-center items-center w-72 p-6 bg-white rounded-lg shadow-lg">
        <img
          src={logourl}
          alt="Logo"
          className="w-20 h-20 object-contain mb-4 cursor-pointer"
        />
        <h1 className="text-xl font-bold mb-4 cursor-pointer">
          {isLogin ? "Log in" : "Sign up"}
        </h1>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          {!isLogin && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="p-2 rounded border border-gray-300 outline-0"
              required
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="p-2 rounded border border-gray-300 outline-0"
            required
          />
          {formData.email && !isEmailValid && (
            <div className="text-sm text-red-700 bg-red-100 px-3 py-1 rounded">
              Email must end with <strong>@gmail.com</strong>
            </div>
          )}

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="p-2 rounded border border-gray-300 outline-0"
            required
          />
          {formData.password && !isPasswordValid && (
            <div className="text-sm text-red-700 bg-red-100 px-3 py-1 rounded">
              Password must be at least 8 characters, contain a number and a
              special character.
            </div>
          )}

          <button
            type="submit"
            className="bg-black text-white py-2 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!isFormValid}
          >
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setFormData({ username: "", email: "", password: "" });
          }}
          className="mt-4 text-sm text-black"
        >
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span className="underline text-blue-700 font-medium cursor-pointer">
                Sign Up
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span className="underline text-blue-700 font-medium cursor-pointer">
                Log In
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
