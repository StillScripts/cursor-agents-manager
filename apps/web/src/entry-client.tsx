/// <reference types="vinxi/types/client" />

import { StartClient } from "@tanstack/react-start"
import { hydrateRoot } from "react-dom/client"
import { getRouter } from "./router"

const router = getRouter()

hydrateRoot(document.getElementById("root")!, <StartClient router={router} />)
