import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/CategoryProductStyles.css";
import axios from "axios";
import toast from "react-hot-toast";
import { useCart } from "../context/cart";
import { AiOutlineReload } from "react-icons/ai";

const CategoryProduct = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [cart, setCart] = useCart();

  const [allProducts, setAllProducts] = useState([]);
  const [category, setCategory] = useState([]);

  const [page, setPage] = useState(1);
  const perPage = 6;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params?.slug) {
      setPage(1);
      getProductsByCat();
    }
  }, [params?.slug]);

  const getProductsByCat = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        `/api/v1/product/product-category/${params.slug}`
      );
      setAllProducts(data?.products);
      setCategory(data?.category);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load category products");
    } finally {
      setLoading(false);
    }
  };

  // Show only a slice, load more increases page
  const products = useMemo(() => {
    return allProducts.slice(0, page * perPage);
  }, [allProducts, page]);

  const handleAddToCart = (p) => {
    const updated = [...cart, p];
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    toast.success("Item Added to cart");
  };
  
  const total = allProducts.length;

  return (
    <Layout>
      <div className="container mt-3 category">
        <h4 className="text-center">Category - {category?.name}</h4>
        <h6 className="text-center">{total} result found</h6>
        <div className="row">
          <div className="col-md-9 offset-1">
            <div className="d-flex flex-wrap">
              {products?.map((p) => (
                <div className="card m-2" key={p._id}>
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                  />
                  <div className="card-body">
                    <div className="card-name-price">
                      <h5 className="card-title">{p.name}</h5>
                      <h5 className="card-title card-price">
                        {p.price.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </h5>
                    </div>
                    <p className="card-text ">
                      {p.description.substring(0, 60)}...
                    </p>
                    <div className="card-name-price">
                      <button
                        className="btn btn-info ms-1"
                        onClick={() => navigate(`/product/${p.slug}`)}
                      >
                        More Details
                      </button>
                      <button
                        className="btn btn-dark ms-1"
                        onClick={() => handleAddToCart(p)}
                      >
                    ADD TO CART
                  </button> 
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="m-2 p-3">
              {products.length < total && (
                <button
                  className="btn loadmore"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((prev) => prev + 1);
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    "Loading ..."
                  ) : (
                    <>
                      {" "}
                      Loadmore <AiOutlineReload />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryProduct;