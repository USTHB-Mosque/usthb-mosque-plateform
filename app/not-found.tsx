"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MoveLeft } from "lucide-react";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
          className="text-9xl font-k2d font-bold text-gray-900 mb-4"
        >
          404
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <h2 className="text-3xl font-medium text-gray-800">Page non trouvée</h2>
          <p className="text-gray-600 max-w-md mx-auto text-lg">
            Oups ! La page que vous recherchez semble avoir disparu. Laissez-nous
            vous ramener dans le jeu.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-gray-800 transition-all duration-300 hover:scale-105 group"
          >
            <MoveLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Retour à l'accueil
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute -z-10 opacity-5"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <svg
          width="600"
          height="600"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 92C26.8 92 8 73.2 8 50S26.8 8 50 8s42 18.8 42 42-18.8 42-42 42z"
            fill="currentColor"
          />
          <path
            d="M50 8c-6.6 0-12.8 1.6-18.2 4.4L45 36.2 50 28l5 8.2 13.2-23.8C62.8 9.6 56.6 8 50 8zM24.6 15.6C17 21 11 28.8 8.8 38h25.4L24.6 15.6zm50.8 0L65.8 38h25.4c-2.2-9.2-8.2-17-15.8-22.4zM8 50c0 4.2.6 8.2 1.8 12h23.4L24.8 48 8 50zm84 0l-16.8-2-8.4 14H90.2c1.2-3.8 1.8-7.8 1.8-12zM36.2 66H15.6c4.6 10.8 13.6 18.8 24.6 21.8L36.2 66zm27.6 0l-4 21.8c11-3 20-11 24.6-21.8H63.8z"
            fill="currentColor"
          />
        </svg>
      </motion.div>
    </div>
  );
};
export default NotFound;
