/**
 * @jest-environment jsdom
 */

import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import "@testing-library/jest-dom";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH, ROUTES } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

const setupEmployee = () => {
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem(
    "user",
    JSON.stringify({ type: "Employee", email: "e@e" })
  );
  document.body.innerHTML = `<div id="root"></div>`;
  router();
};

describe("Given I'm connected as an Employee", () => {
  beforeEach(() => {
    setupEmployee();
  });

  describe("Constructor behavior", () => {
    test("Then should attach event listeners", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const billsInstance = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      const newBillBtn = screen.getByTestId("btn-new-bill");
      const eyeIcons = screen.getAllByTestId("icon-eye");
      expect(newBillBtn).toBeTruthy();
      expect(eyeIcons.length).toBeGreaterThan(0);
    });
  });

  describe("When, I'm on Bills page", () => {
    beforeEach(async () => {
      $.fn.modal = jest.fn();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
    });

    test("Then, Icon should be highlighted", () => {
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then, Bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d{2}[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      expect(dates).toEqual([...dates].sort(antiChrono));
    });

    test("Then, clicking 'New Bill' should navigate to NewBill page", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
        window.location.hash = pathname;
      };

      const billsInstance = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      fireEvent.click(screen.getByTestId("btn-new-bill"));
      await waitFor(() =>
        expect(window.location.hash).toBe(ROUTES_PATH.NewBill)
      );
    });

    test("Then, clicking eye icon should show modal with image", () => {
      const billsInstance = new Bills({
        document,
        onNavigate: () => {},
        store: null,
        localStorage: window.localStorage,
      });

      fireEvent.click(screen.getAllByTestId("icon-eye")[0]);
      expect($.fn.modal).toHaveBeenCalledWith("show");
    });
  });

  describe("getBills()", () => {
    test("Then should return bills in correct format", async () => {
      const rawBills = [
        { date: "2023-01-01", status: "pending" },
        { date: "2022-02-01", status: "accepted" },
        { date: "2021-03-03", status: "refused" },
      ];

      const formattedBills = [
        { date: "1 Jan. 23", status: "En attente" },
        { date: "1 Fév. 22", status: "Accepté" },
        { date: "3 Mar. 21", status: "Refusé" },
      ];

      const store = {
        bills: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue(rawBills),
        }),
      };

      const billsInstance = new Bills({
        document,
        onNavigate: () => {},
        store,
        localStorage: window.localStorage,
      });

      const result = await billsInstance.getBills();
      expect(result).toEqual(formattedBills);
    });

    test("Then should return unformatted date on formatDate error", async () => {
      const rawBills = [{ date: "invalid-date", status: "pending" }];

      const store = {
        bills: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue(rawBills),
        }),
      };

      const billsInstance = new Bills({
        document,
        onNavigate: () => {},
        store,
        localStorage: window.localStorage,
      });

      const result = await billsInstance.getBills();
      expect(result[0].date).toBe("invalid-date");
      expect(result[0].status).toBe("En attente");
    });

    test("Then should return empty array if no data", async () => {
      const store = {
        bills: jest.fn().mockReturnValue({
          list: jest.fn().mockResolvedValue([]),
        }),
      };

      const billsInstance = new Bills({
        document,
        onNavigate: () => {},
        store,
        localStorage: window.localStorage,
      });

      const result = await billsInstance.getBills();
      expect(result).toEqual([]);
    });
  });

  describe("When I navigate to Bills", () => {
    test("Then should fetch bills from mock API GET and display them correctly", async () => {
      jest.spyOn(mockStore, "bills").mockReturnValue({
        list: jest
          .fn()
          .mockResolvedValue([{ date: "2023-01-01", status: "accepted" }]),
      });

      window.onNavigate(ROUTES_PATH.Bills);

      const formattedDate = await screen.findByText("1 Jan. 23");
      expect(formattedDate).toBeTruthy();

      const status = await screen.findByText("Accepté");
      expect(status).toBeTruthy();

      expect(mockStore.bills().list).toHaveBeenCalled();
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
      });

      test("Then should show 404 error", async () => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 404")),
        }));

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        expect(await screen.getByText(/Erreur 404/)).toBeTruthy();
      });

      test("Then should show 500 error", async () => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 500")),
        }));

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        expect(await screen.getByText(/Erreur 500/)).toBeTruthy();
      });
    });
  });
});
