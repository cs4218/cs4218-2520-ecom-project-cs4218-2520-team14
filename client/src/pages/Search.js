import React from "react";
import Layout from "./../components/Layout";
import { useSearch } from "../context/search";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import toast from "react-hot-toast";

const Search = () => {
  const [values] = useSearch();
  const navigate = useNavigate();
  const [cart, setCart] = useCart();

  const results = values?.results || [];
  const count = results.length;

  return (
    <Layout title={"Search results"}>
      <div className="container py-4">
        <div className="text-center mb-4">
          <h1 className="mb-2">Search Results</h1>
          <p className="text-muted mb-0">
            {count < 1
              ? "No products found"
              : `Found ${count} product${count === 1 ? "" : "s"}`}
          </p>
        </div>
        {count < 1 ? (
          <div className="text-center py-5">
            <div className="alert alert-light border d-inline-block px-4 py-3 mb-0">
              Try a different keyword.
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {results.map((p) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={p._id}>
                <div className="card h-100 shadow-sm">
                  <img
                    src={`/api/v1/product/product-photo/${p._id}`}
                    className="card-img-top"
                    alt={p.name}
                    style={{ height: 180, objectFit: "cover" }}
                  />

                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <h6
                        className="card-title mb-1 text-truncate"
                        title={p.name}
                      >
                        {p.name}
                      </h6>
                      <span className="fw-bold">
                        {p.price?.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </span>
                    </div>

                    <p className="card-text text-muted small mb-3">
                      {p.description.substring(0, 60)}
                      {p.description.length > 60 ? "..." : ""}
                    </p>

                    <div className="mt-auto d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-info btn-sm flex-fill"
                        onClick={() => navigate(`/product/${p.slug}`)}
                      >
                        More Details
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm flex-fill"
                        onClick={() => {
                          setCart([...cart, p]);
                          localStorage.setItem(
                            "cart",
                            JSON.stringify([...cart, p]),
                          );
                          toast.success("Item Added to cart");
                        }}
                      >
                        ADD TO CART
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Search;
