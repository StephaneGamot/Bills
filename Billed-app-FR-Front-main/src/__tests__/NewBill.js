/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import userEvent from "@testing-library/user-event";
import router from "../app/Router.js";
import "@testing-library/jest-dom";

beforeEach(() => {
	Object.defineProperty(window, "localStorage", { value: localStorageMock });            // Pour les test je remplace la propriété du localStorage, cela permet de simuler une interaction avec le local storage sans avoir un besoin réél d'un navigateur
	Object.defineProperty(window, "location", { value: { hash: ROUTES_PATH["NewBill"] } });// Je remplace la propriété location par un objet simulé et simulet le fait d'être sur la page "NewBill".

	window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));             // Cela simule la situation où un utilisateur de type "Employee" est actuellement connecté.
	document.body.innerHTML = `<div id="root"></div>`;
	router();
});

describe("Given I am connected as an employee", () => {
	describe("When I am on NewBill Page", () => {
		test("Then mail icon in vertical layout should be highlighted", () => {// On va vérifier ici que le "mail icon" est "brillant"
			const icon = screen.getByTestId("icon-mail");                      // Avec "getByTestId" on va sélectionner un élément spécifique sur la page
			// To-do write assertion
			expect(icon.className).toBe("active-icon");                        // Et ici on s'attend (on le verifie) à ce que "icon"  ait une classe nommée "active-icon"
		});
		// POST
		test("Then verify the file bill", async () => {
			jest.spyOn(mockStore, "bills");                                    // Création d'un espion

			const onNavigate = (pathname) => {                                 // simulation que l'on navigue vers une autre page
				document.body.innerHTML = ROUTES({ pathname });
			};

			window.localStorage.setItem(  	                                   // Cela simule un utilisateur connecté en tant qu'"Employee".
				"user",
				JSON.stringify({
					type: "Employee",
				})
			);

			const html = NewBillUI();                                          // j'apelle la fonction qui représente NewBillUI() (en simple le contenu de la page en HTML)
			document.body.innerHTML = html;                                    // que j'insère 

			const newBillInit = new NewBill({                                  // Création d'un instance de classe qui contient .....
				document,
				onNavigate,
				store: mockStore,
				localStorage: window.localStorage,
			});

			const file = new File(["image"], "image.png", { type: "image/png" });    // création d'un objet "PNG"
			const handleChangeFile = jest.fn((e) => newBillInit.handleChangeFile(e));// Permet de vérifier si la méthode simulé a été appelée,
			const formNewBill = screen.getByTestId("form-new-bill");                 //la méthode getByTestId permet de sélectionner des éléments du DOM par leur attribut data-testid (formulaire)
			const billFile = screen.getByTestId("file");                             // la méthode getByTestId permet de sélectionner des éléments du DOM par leur attribut data-testid (chargement du formulaire)

			billFile.addEventListener("change", handleChangeFile);                   // Je rajoute un addEventListener « change » et lorsqu'un fichier est sélectionné, il appelle handleChangeFile().
			userEvent.upload(billFile, file);                                        // On simule l'action de télécharger un fichier. Elle déclenche l'événement "change", qui à son tour appelle handleChangeFile().

			expect(billFile.files[0].name).toBeDefined();                            // Il vérifie que le 1er fichier téléchargé a un nom ce qui prouve que l'opération c'est bien déroulé
			expect(handleChangeFile).toBeCalled();                                   // Il verifie que "handleChangeFile" a bien été appelé lors du téléchargement

			const handleSubmit = jest.fn((e) => newBillInit.handleSubmit(e));        // Cette simulation permet de vérifier si handleSubmit() a été appelée,
			formNewBill.addEventListener("submit", handleSubmit);                    // Je rajoute un addEventListener « change » et lorsqu'un fichier est sélectionné, il appelle  handleSubmit().
			fireEvent.submit(formNewBill);                                           //  Elle déclenche manuellement l'événement "submit" sur le formulaire, comme si on avait cliqué sur le bouton de soumission du formulaire ce qui va déclencher le addEventListener
			expect(handleSubmit).toHaveBeenCalled();                                 // Il vérifie que la fonction handleSubmit (SOUMISSION DU FORMULAIRE) a été appelée lorsque le formulaire a été soumis.
		});
	});

	describe("When I want to update an existing bill", () => {
		const onNavigate = jest.fn();                                              // C'est une fonction de Jest qui permet de créer une fonction simulée.
		const billId = "123";
		const bill = {                                                             // Elle représente une facture
			id: billId,
			name: "Updated bill",
			amount: "150",
			date: "2023-05-05",
			vat: "20",
			pct: "20",
			commentAdmin: "",
			email: "employee@example.com",
			fileId: "fileID",
			fileName: "filename.png",
			fileUrl: "https://example.com/filename.png",
			status: "pending",
			type: "Restaurant",
		};
		/* On simule l'appel à la méthode updateBill, puis on vérifie 
           que les méthodes appropriées ont été appelées avec leurs arguments 
           et que l’on est redirigé vers la bonne page */
		test("Then the bill should be updated and the user should be navigated to the Bills page", () => {
			const updateMock = jest.fn().mockResolvedValue({ status: 200 });         //  Simule une opération réussie de mise à jour de facture.
			const billsMock = { update: updateMock };                                // C'est le mock juste au dessus.

			const storeMock = {
				bills: jest.fn(() => billsMock),
			};

			const newBill = new NewBill({ document, onNavigate, store: storeMock, localStorage: window.localStorage }); //  Quand on appelle this.store.bills().update(...), il appelle en réalité le mock créé
			newBill.billId = billId;

			newBill.updateBill(bill);

			expect(storeMock.bills).toHaveBeenCalled();                                                     // vérifie que la méthode bills de l'objet storeMock a été appelée.
			expect(billsMock.update).toHaveBeenCalledWith({ data: JSON.stringify(bill), selector: billId });// Vérifie que la méthode update de l'objet billsMock a été appelée avec les arguments appropriés.

			return updateMock().then(() => {                                                                // On appelle "updateMock" qui retourne une promesse qui vérifie que "onNavigate" a été appelée avec le chemin correct
				expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
			});
		});

		// La mise à jour devrait alors échouer et afficher une erreur
		test("Then the bill update should fail and log an error", async () => {
			const errorMsg = "Failed to update bill";                                // Création d'un message d'erreur (pour la simulation)
			const updateMock = jest.fn().mockRejectedValue(new Error(errorMsg));     // Création d'un mock (fausse implémentation) de la fonction update qui renvoie une promesse rejetée, simulant un échec
			const billsMock = { update: updateMock };                                // Création d’un objet qui représente une fausse version de bills, la méthode update sera remplacée par le mock juste créer au-dessus.

			const storeMock = {                                                      // On renvoie notre objet billsMock lorsque la méthode bills est appelée.
				bills: jest.fn(() => billsMock),
			};

			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});                          // Création d'un "espion" qui surveille les appels à la console.error

			const newBill = new NewBill({ document, onNavigate, store: storeMock, localStorage: window.localStorage }); // Creation d'un nouvelle instance mais le "store" sera storeMock (voir + haut)
			newBill.billId = billId;

			newBill.updateBill(bill);                                                                                   // storeMock va declencher notre fausse méthode update.

			expect(storeMock.bills).toHaveBeenCalled();                                                                 // Vérifie que la fonctions mockées (storeMock) a été appelée comme prévu.
			expect(billsMock.update).toHaveBeenCalledWith({ data: JSON.stringify(bill), selector: billId });            // Vérifie que la fonctions mockées (billsMock) a été appelée comme prévu.

			// On attend la résolution de la promesse, qui sera rejetée, crera une execption "catché" ...
			try {
				await updateMock();
			} catch (error) {
				expect(consoleErrorSpy).toHaveBeenCalledWith(error);                   // On vérifie que le console.error a été appelé
				consoleErrorSpy.mockRestore();                                         // Enfin la restauration de l'originale de console.error
			}
		});
	});
	describe("Given I am connected as an employee", () => {
		// Il devrait appeler store.bills().create avec les données correctes lorsque handleChangeFile est appelé avec un fichier valide
		test("should call store.bills().create with correct data when handleChangeFile is called with a valid file", () => {
			// Mock DOM elements and store
			const mockFile = new File([""], "image.jpg", { type: "image/jpeg" });   // Création un faux fichier pour simuler ... un fichier 
			const fileInput = {
				addEventListener: jest.fn(),                                        // création une nouvelle fonction mock. 
				files: [mockFile],
			}; 
	
			const formNewBill = { addEventListener: jest.fn() };
	
			const mockDocument = {                                                  // Création d'un faux document 
				querySelector: jest.fn((selector) => {                              // création une nouvelle fonction mock pour simuler ce querySelector
					if (selector === `input[data-testid="file"]`) {
						return fileInput;
					} else if (selector === `form[data-testid="form-new-bill"]`) {
						return formNewBill;
					}
				}),
				querySelectorAll: jest.fn(() => []),                                // création une nouvelle fonction mock, qui quand elle est appellée elle renvoi un tableau vide 
			};
	
			const createBillMock = jest.fn().mockResolvedValue({ fileUrl: "fileUrl", key: "key" });
			const mockStore = {                                                     // Création d'une "imitation" de la note d'envoi
				bills: () => ({
					create: createBillMock,
				}),
			};
	
			const newBill = new NewBill({
				document: mockDocument,
				onNavigate: jest.fn(),                                              // Création une nouvelle fonction mock pour simuler un changement de page
				store: mockStore,
				localStorage: window.localStorage,
			});
	
			newBill.createFormData = jest.fn((file) => {
				const formData = new FormData();
				formData.append("file", file);
				return formData;
			});
	
			const mockEvent = {                                                     // Création d'un faux evenement
				preventDefault: jest.fn(),                                          // Pour empecher le comportement par défaut 
				target: {                                                           // Mais l'envoyer intentionnelement ici 
					value: "C:\\fakepath\\image.jpg",
				},
			};
	
			newBill.handleChangeFile(mockEvent);

	// On vérifie que createBillMock a été appelé avec les bons arguments. 
    //Si handleChangeFile fonctionne correctement, il doit appeler store.bills().create avec les données du fichier et des en-têtes spécifiques.
			expect(createBillMock).toHaveBeenCalledWith({
				data: newBill.createFormData(mockFile),
				headers: {
					noContentType: true,                   // On indique que la requête ne devrait pas inclure un en-tête 'Content-Type'.
				},
			});
		});
	});
	
	
	
	  
});
