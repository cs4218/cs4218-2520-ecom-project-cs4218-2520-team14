import React, { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import AdminMenu from "../../components/AdminMenu";
import axios from "axios";
import toast from "react-hot-toast";

const Users = () => {
  const [users, setUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const { data } = await axios.get("/api/v1/auth/users");
      setUsers(data?.users || data);
    } catch (error) {
      console.log("STATUS:", error?.response?.status);
      console.log("DATA:", error?.response?.data);
      console.log("MSG:", error?.message);
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    }
  };

  useEffect(() => {
    getAllUsers();
  }, []);

  return (
    <Layout title={"Dashboard - All Users"}>
      <div className="container-fluid m-3 p-3">
        <div className="row">
          <div className="col-md-3">
            <AdminMenu />
          </div>
          <div className="col-md-9">
            <h1 className="text-center">All Users</h1>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.length ? (
                    users.map((u, idx) => (
                      <tr key={u._id}>
                        <td>{idx + 1}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || "-"}</td>
                        <td>{u.address || "-"}</td>
                        <td>{u.role === 1 ? "Admin" : "User"}</td>
                        <td>
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Users;