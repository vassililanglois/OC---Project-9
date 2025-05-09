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

  describe("When I am on Bills Page", () => {
    beforeEach(async () => {
      $.fn.modal = jest.fn();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
    });

    test("Then bill icon in vertical layout should be highlighted", () => {
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon).toHaveClass("active-icon");
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      expect(dates).toEqual([...dates].sort(antiChrono));
    });

    test("Then clicking on the 'New Bill' button should navigate to the New Bill page", async () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
        window.location.hash = pathname;
      };

      new Bills({
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

    test("Then clicking on the 'Eye' icon should display the bill image in a modal", () => {
      new Bills({
        document,
        onNavigate: () => {},
        store: null,
        localStorage: window.localStorage,
      });

      fireEvent.click(screen.getAllByTestId("icon-eye")[0]);
      expect($.fn.modal).toHaveBeenCalledWith("show");
    });

    describe("When I call getBills", () => {
      test("Then it should return bills in the correct format", async () => {
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
    });
  });

  describe("When I navigate to Bills", () => {
    test("Then fetches bills from mock API GET", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      const billsStatus = await screen.findAllByText(
        /Accepté|En attente|Refusé/
      );
      expect(billsStatus.length).toBeGreaterThan(0);
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
      });

      test("Then fetches bills and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 404")),
        }));

        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        expect(await screen.getByText(/Erreur 404/)).toBeTruthy();
      });

      test("Then fetches bills and fails with 500 message error", async () => {
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
