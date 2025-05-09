/**
 * @jest-environment jsdom
 */

import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({ type: "Employee", email: "e@e" })
    );

    document.body.innerHTML = `<div id="root"></div>`;
    router();
  });
  describe("When I am on NewBill Page", () => {
    beforeEach(async () => {
      window.onNavigate(ROUTES_PATH.NewBill);
      await waitFor(() => screen.getByTestId("icon-mail"));
    });

    test("Then mail icon in vertical layout should be highlighted", () => {
      const mailIcon = screen.getByTestId("icon-mail");
      expect(mailIcon).toHaveClass("active-icon");
    });

    test("Then should display alert if the file extension is invalid", () => {
      const invalidFile = new File(["dummy content"], "file.pdf", {
        type: "application/pdf",
      });

      // Mock alert
      window.alert = jest.fn();

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");

      Object.defineProperty(fileInput, "files", {
        value: [invalidFile],
      });

      fireEvent.change(fileInput);

      expect(window.alert).toHaveBeenCalledWith(
        "Seuls les fichiers jpg, jpeg ou png sont autorisés."
      );
      expect(fileInput.value).toBe("");
    });

    test("Then the bill should be saved and I should be navigated to Bills page", async () => {
      const onNavigate = jest.fn();
      const updateMock = jest.fn().mockResolvedValue();
      const store = {
        bills: jest.fn(() => ({
          update: updateMock,
        })),
      };

      document.body.innerHTML = `
        <form data-testid="form-new-bill">
          <select data-testid="expense-type">
            <option value="Transports" selected>Transports</option>
          </select>
          <input data-testid="expense-name" value="Train Paris" />
          <input data-testid="amount" value="120" />
          <input data-testid="datepicker" value="2024-05-01" />
          <input data-testid="vat" value="20" />
          <input data-testid="pct" value="20" />
          <textarea data-testid="commentary">Billet de train</textarea>
          <input type="file" data-testid="file" />
          <button type="submit">Envoyer</button>
        </form>
      `;

      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      newBill.fileUrl = "https://example.com/bill.jpg";
      newBill.fileName = "bill.jpg";
      newBill.billId = "1234";

      const form = screen.getByTestId("form-new-bill");
      await newBill.handleSubmit({ preventDefault: jest.fn(), target: form });

      expect(store.bills).toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith({
        data: JSON.stringify({
          type: "Transports",
          name: "Train Paris",
          amount: 120,
          date: "2024-05-01",
          vat: "20",
          pct: 20,
          commentary: "Billet de train",
          fileUrl: "https://example.com/bill.jpg",
          fileName: "bill.jpg",
          status: "pending",
        }),
        selector: "1234",
      });

      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });
  });
});
