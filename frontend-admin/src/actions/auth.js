import { auth, user } from "../utils/toBackend";
import {
  ERROR_MESSAGE,
  FETCH_USER,
  NO_MESSAGE,
  SUCCESS_MESSAGE,
} from "../actions/types";
import {
  deleteLocalStorage,
  getLocalStorage,
  setLocalStorage,
} from "../utils/localStorage";
import {
  deleteSessionStorage,
  setSessionStorage,
} from "../utils/sessionStorage";
import { generateRandomPassword, setTokenHeader } from "../utils/helper";
import { sendEmail } from "./newsletters";

export const login =
  (usernameEmail, password, rememberMe) => async (dispatch) => {
    dispatch({ type: NO_MESSAGE });

    let errorMessage = "";
    if (!usernameEmail || usernameEmail === "") {
      errorMessage += "Unesite email. ";
    }
    if (!password || password === "") {
      errorMessage += "Unesite lozinku.";
    }

    if (errorMessage !== "") {
      dispatch({ type: ERROR_MESSAGE, payload: errorMessage });
    } else {
      const bodyRequest = {
        usernameEmail: usernameEmail,
        password: password,
      };

      auth
        .post("/login", bodyRequest)
        .then((res) => {
          if (rememberMe) {
            setLocalStorage("user", {
              token: res.data.token,
              id: res.data._id,
            });
          } else {
            setSessionStorage("user", {
              token: res.data.token,
              id: res.data._id,
            });
          }
          if (res.data.isAdmin) window.location.href = "/home";
          else
            dispatch({
              type: ERROR_MESSAGE,
              payload: "Vi niste ovlašćeni!",
            });
        })
        .catch((error) => {
          dispatch({
            type: ERROR_MESSAGE,
            payload: error.response.data,
          });
        });
    }
  };

export const loginByToken = () => async (dispatch) => {
  dispatch({ type: NO_MESSAGE });
  setTokenHeader(auth);

  auth
    .post("/loginByToken")
    .then((res) => {
      if (getLocalStorage("user")) {
        setLocalStorage("user", { token: res.data.token, id: res.data._id });
      } else {
        setSessionStorage("user", { token: res.data.token, id: res.data._id });
      }
      window.location.href = "/home";
    })
    .catch((error) => {
      dispatch({
        type: ERROR_MESSAGE,
        payload: error.response.data,
      });
    });
};

export const logout = () => {
  deleteLocalStorage("user");
  deleteSessionStorage("user");
  window.location.pathname = "/";
};

export const forgotPassword = (formDataObj) => async (dispatch) => {
  dispatch({ type: NO_MESSAGE });

  if (formDataObj.email == null || formDataObj.email === "") {
    dispatch({
      type: ERROR_MESSAGE,
      payload: "Obavezno je unošenje email-a!",
    });
  } else {
    user
      .post("/filter", formDataObj)
      .then((response) => {
        dispatch({ type: FETCH_USER, payload: response.data });
        console.log(response);
        if (response.data.isAdmin) {
          let newPassword = generateRandomPassword();
          const message =
            "Poslat je zahtjev za resetovanje lozinke. Vaša privremena lozinka je " +
            newPassword.toString();
          const bodyRequest = {
            newPassword: newPassword,
            email: formDataObj.email,
          };
          auth
            .put("/fgpass", bodyRequest)
            .then((res) => {
              const emailObject = {
                to_email: formDataObj.email,
                from: "verdi.radnja.2010@gmail.com",
                name: "Verdi Radnja",
                subject: "Nova privremena lozinka",
                templateId: "template_jcmdzec",
                message: message,
              };
              dispatch(sendEmail(emailObject));
            })
            .catch((err) => {
              dispatch({ type: ERROR_MESSAGE, payload: err.response.data });
            });
        } else
          dispatch({
            type: ERROR_MESSAGE,
            payload: "Vi niste ovlašćeni!",
          });
      })
      .catch((error) => {
        dispatch({
          type: ERROR_MESSAGE,
          payload: error.response.data,
        });
      });
  }
};
