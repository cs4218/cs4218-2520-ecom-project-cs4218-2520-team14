//Teng Hui Xin Alicia, A0259064Y
import { renderHook, act } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

const setup = () => renderHook(() => useSearch(), { wrapper: SearchProvider });

describe("Search context", () => {
  it("starts with empty keyword and no results", () => {
    const { result } = setup();
    const [state, setState] = result.current;

    expect(state).toEqual({ keyword: "", results: [] });
    expect(setState).toEqual(expect.any(Function));
  });

  it("can update keyword and results", () => {
    const { result } = setup();

    const products = [{ _id: "p1", name: "Yellow Dress", price: 25 }];

    act(() => {
      result.current[1]((prev) => ({ ...prev, keyword: "dress" }));
    });
    act(() => {
      result.current[1]((prev) => ({ ...prev, results: products }));
    });

    expect(result.current[0]).toEqual({
      keyword: "dress",
      results: products,
    });
  });

  it("preserves results when only keyword changes", () => {
    const { result } = setup();
    const products = [{ _id: "p2", name: "Blue Jeans", price: 60 }];

    act(() => {
      result.current[1]({ keyword: "", results: products });
    });
    act(() => {
      result.current[1]((prev) => ({ ...prev, keyword: "jeans" }));
    });

    expect(result.current[0]).toEqual({
      keyword: "jeans",
      results: products,
    });
  });
});