// src/pages/Home.jsx
import React, { useState } from "react";
import Homepage from "../components/Homepage";           // <-- NEU
import KonfiguratorModal from "../components/KonfiguratorModal";
import Footer from "../components/Footer";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openKonfigurator = () => setIsModalOpen(true);
  const closeKonfigurator = () => setIsModalOpen(false);

  return (
    <div>
      <Homepage onOpenKonfigurator={openKonfigurator} />
      <KonfiguratorModal isOpen={isModalOpen} onClose={closeKonfigurator} />
      <Footer />
    </div>
  );
}