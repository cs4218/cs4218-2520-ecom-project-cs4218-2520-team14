import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/auth";
import Spinner from "../Spinner";

export default function AdminRoute() {
  const [ok, setOk] = useState(true);
  const [auth, setAuth] = useAuth();

  // useEffect(() => {
  //   const authCheck = async () => {
  //     try {
  //       const res = await axios.get("/api/v1/auth/admin-auth");
  //       if (res.data.ok) {
  //         setOk(true);
  //       } else {
  //         setOk(false);
  //       }
  //     } catch (error) {
  //       setOk(false);
  //     }
  //   };
  //   if (auth?.token) authCheck();
  // }, [auth?.token]);

  return ok ? <Outlet /> : <Spinner />;
}
