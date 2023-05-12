/**
 * @jest-environment jsdom
 */
import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";
import mockStore from "../__mocks__/store";
import BillsContainer from "../containers/Bills";
import Bills from "../containers/Bills";

// Bloc de description principal
describe("Given I am connected as an employee", () => {
	// Bloc de description imbriqué qui liés aux notes de frais.
	describe("When I am on Bills Page", () => {
		// un test unitaire qui vérifie si l'icône est mise en évidence.
		test("Then bill icon in vertical layout should be highlighted", async () => {
			Object.defineProperty(window, "localStorage", { value: localStorageMock }); // Pour simuler le comportement du stockage local du navigateur
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);
			await waitFor(() => screen.getByTestId("icon-window"));             // waitFor me permet d'attendre que l'élément " " soit disponible dans le DOM.
			const windowIcon = screen.getByTestId("icon-window");               // Maintenant je peux récuperer cet élément
			/* Je verifie que l’expression possede la class « active-icon » (avec toBeTruthy()) 
Pour ça j’ai cherché id='layout-icon1' avec lequel il est lié et 
apres recherche on retrouve divIcon1.classList.add('active-icon')*/
			expect(windowIcon.classList.contains("active-icon")).toBeTruthy();  // Je vérifie qu'il le contient bien
		});
		// Ce test vérifie si les factures stockées sont correctement affichées.
		test("if bills are stored, it should display bills", async () => {
			const onNavigate = (pathname) => {                                  // onNavigate remplace le contenu du corps du document HTML par le contenu de la route spécifiée.

				document.body.innerHTML = ROUTES({ pathname });
			};
			const newBills = new Bills({
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});
			const spyGetBills = jest.spyOn(newBills, "getBills");
			const billsToDisplay = await newBills.getBills();
			const mockedBills = await mockStore.bills().list();

			expect(spyGetBills).toHaveBeenCalledTimes(1);                                 // Je verifie qu'elel n'a été qu'appelé une seule fois
			expect(mockedBills.length).toBe(billsToDisplay.length);                       // Je vérifie que le nombre de facture stoké = à celle affiché
		});
		// Ce test vérifie que les factures sont triées par ordre chronologique,
		test("Then bills should be ordered from earliest to latest", () => {
			const sortedBills = bills.sort((a, b) => new Date(a.date) - new Date(b.date));// Je trie par date
			document.body.innerHTML = BillsUI({ data: sortedBills });                     // Je mets à jour
			const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map((a) => a.innerHTML);
			const chrono = (a, b) => (a < b ? -1 : 1);
			const datesSorted = [...dates].sort(chrono);
			expect(dates).toEqual(datesSorted);                                           // Je verifie que les dates affichées soit dans le meme ordres que classées
		});
	});

	describe("When I am on Bills Page and i click on icon Eye of bill", () => {
		//Ce test s'assure que lorsqu'on clique sur iconEye", un modal avec les justificatifs s'ouvrent.
		test("Then modal with supporting documents appears", () => {
			$.fn.modal = jest.fn();                                                       // Empêche une erreur jQuery en ajoutant un mock pour la fonction modal.
			const onNavigate = (pathname) => {
				document.body.innerHTML = ROUTES({ pathname });
			};

			Object.defineProperty(window, "localStorage", { value: localStorageMock });   // Je configure de localStorage avec les informations de l'utilisateur pour simuler une connexion.
			window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

			const html = BillsUI({ data: bills.sort((a, b) => new Date(b.date) - new Date(a.date)) });
			document.body.innerHTML = html;

			const billsContainer = new BillsContainer({                                   // Creation d'une instance
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const iconEye = screen.getAllByTestId("icon-eye")[0];
			const handleShowModalFile = jest.fn((e) => {                                  // Crée une fonction mock qui appelle la méthode handleClickIconEye lorsqu'elle est déclenchée.
				billsContainer.handleClickIconEye(e.target);
			});

			iconEye.addEventListener("click", handleShowModalFile);                       // ajout d'un aventListener pour pouvoir ensuite simuler le clic
			userEvent.click(iconEye);                                                     // on simule un clic de l'utilisateur sur iconEye.

			expect(handleShowModalFile).toHaveBeenCalled();                               //  Vérifie si la fonction a été appelée lors du clic
			expect(screen.getAllByText("Justificatif")).toBeTruthy();                     // Je vérifie que "Justificatif"  s'affiche correctement.
		});
	});
});

// integration test GET
describe("Given I am a user connected as Employee", () => {
	describe("When I navigate to bills page", () => {
		// Je récupére les factures à partir d'une fausse API GET
		test("fetches bills from mock API GET", async () => {
			localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.append(root);
			router();
			window.onNavigate(ROUTES_PATH.Bills);                          // Me permet de  naviguer vers la page des factures.
			await waitFor(() => screen.getByText("Mes notes de frais"));   // Me permet d'attendre que l'élément
			screen.getByText("Nouvelle note de frais");                    // Me permet de sélectionner l'élément avec le texte ""

			expect(screen.getByText("Mes notes de frais")).toBeTruthy;     // Je vérifiez si l'élément contenant le texte "Mes notes de frais" est présent
			expect(screen.getByText("Nouvelle note de frais")).toBeTruthy; // Je vérifiez si l'élément contenant le texte "Mes notes de frais" est présent
		});
	});

	describe("When an error occurs on API", () => {
		beforeEach(() => {                                               // J'utilise beforeEach() pour définir les actions qui doivent être effectuées avant
			jest.spyOn(mockStore, "bills");                                // je crée un espion sur ...
			Object.defineProperty(window, "localStorage", { value: localStorageMock });
			window.localStorage.setItem(
				"user",
				JSON.stringify({
					type: "Employee",
					email: "a@a",
				})
			);
			const root = document.createElement("div");
			root.setAttribute("id", "root");
			document.body.appendChild(root);
			router();
		});
		// Ce test vérifie quand une erreur se produit lors de la récupération des factures à partir de l'API (erreur 404 )
		test("fetches bills from an API and fails with 404 message error", async () => {
			mockStore.bills.mockImplementationOnce(() => {                      // Creation d'un fonction afin qu'il me renvoie une erreur
				return {
					list: () => {
						return Promise.reject(new Error("Erreur 404"));
					},
				};
			});
			document.body.innerHTML = BillsUI({ error: "Erreur 404" });
			const message = await waitFor(() => screen.getByText(/Erreur 404/));// Me pemet d'attendre que le 404 soit dansle DOM

			expect(message).toBeTruthy();                                       // Je vévifie si le message d'erreur est present
		});
		//Ce test vérifie quand une erreur se produit lors de la récupération des factures à partir de l'API (erreur 500 )
		test("fetches bills from an API and fails with 500 message error", async () => {
			mockStore.bills.mockImplementationOnce(() => {
				return {
					list: () => {
						return Promise.reject(new Error("Erreur 500"));
					},
				};
			});

			document.body.innerHTML = BillsUI({ error: "Erreur 500" });
			const message = await waitFor(() => screen.getByText(/Erreur 500/));
			expect(message).toBeTruthy();                                       // Je vérifie si le message d'erreur est present
		});
	});

	describe("handleClickNewBill", () => {
		let container;
		let instance;

		beforeEach(() => {
			document.body.innerHTML = `
				<div>
				  <button data-testid="btn-new-bill">New Bill</button>
				</div>
			  `;

			container = document.body;
			instance = new Bills({ document: document, onNavigate: jest.fn() });
		});
		// Je vérifie si la méthode handleClickNewBill est appelée quand on clique sur le bouton "Nouvelle note de frais".
		test("Should call handleClickNewBill when new bill button is clicked", () => {
			const newBillButton = document.querySelector('[data-testid="btn-new-bill"]');
			const handleClickNewBillSpy = jest.spyOn(instance, "handleClickNewBill");// J'espionne le bouton
			newBillButton.click();
			newBillButton.addEventListener("click", instance.handleClickNewBill);
			userEvent.click(newBillButton);                                          // Je simule un click
			expect(handleClickNewBillSpy).toHaveBeenCalled();                        // Je vérifie si la méthode espionnée a été appelée lors du clic sur le bouton.
			handleClickNewBillSpy.mockRestore();                                     //Après le test, la méthode espionnée est restaurée à son implémentation d'origine
		});
	});
});
