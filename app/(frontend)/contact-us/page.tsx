"use client"

import * as React from 'react';
import ContactUsClient from './_components/ContactUsClient';
import { motion } from 'motion/react';
import { MapPin, Mail, Phone } from 'lucide-react';
import { FaFacebookMessenger, FaDiscord, FaInstagram, FaFacebookF } from 'react-icons/fa';

const ContactUsPage: React.FC = () => {
    return (
        <ContactUsClient>
            {/* ── Hero Section ── */}
            {/* <section className="flex flex-col items-center justify-center pt-24 pb-0 px-6 md:pt-32 md:pb-0 lg:px-24">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--secondary-500)] mb-4 md:mb-6 text-center"
                    style={{ fontFamily: 'var(--font-khalid)' }}
                >
                    تواصل معنا
                </motion.h1>
            </section> */}

            {/* ── Main Content Section ── */}
            <section className="w-full px-6 py-12 md:px-16 lg:px-24 pt-32 max-w-[1400px] mx-auto mb-8 ">
                <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-8">

                    {/* Right Column: Direct Messaging (First in DOM -> Right side in RTL) */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="bg-white rounded-[20px] p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-8"
                    >
                        <div className="w-20 h-20 rounded-full bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)] mb-4">
                            <FaFacebookMessenger size={40} />
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold text-[var(--secondary-500)]" style={{ fontFamily: 'var(--font-khalid)' }}>
                            تواصل معنا مباشرة
                        </h2>

                        <p className="text-lg text-[var(--muted-foreground)] max-w-lg leading-relaxed">
                            نحن متاحون للرد على استفساراتكم عبر تطبيق مسنجر أو من خلال منصات التواصل الإجتماعي.
                        </p>

                        <a
                            href="https://www.facebook.com/share/1At4vyLD5i/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full max-w-md py-4 px-8 rounded-xl bg-[linear-gradient(90deg,#0DE9C3_0%,#4FF3D7_100%)] text-white font-bold text-xl flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                        >
                            <FaFacebookMessenger size={24} />
                            رسالة مسنجر
                        </a>

                        <div className="w-full flex items-center gap-4 my-4">
                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                            <span className="text-[var(--muted-foreground)]">أو راسلنا على:</span>
                            <div className="h-[1px] flex-1 bg-gray-100"></div>
                        </div>

                        <div className="flex gap-6">
                            {[
                                { icon: <FaDiscord size={28} />, bg: "#5865F21A", color: "#5865F2", href: "https://discord.gg/YpS3GxY2zp" },
                                { icon: <FaInstagram size={28} />, bg: "#E1306C1A", color: "#E1306C", href: "https://instagram.com/usthb_mosque" },
                                { icon: <FaFacebookF size={28} />, bg: "#1877F21A", color: "#1877F2", href: "https://www.facebook.com/share/1At4vyLD5i/" }
                            ].map((social, idx) => (
                                <a
                                    key={idx}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ backgroundColor: social.bg, color: social.color }}
                                    className="w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm"
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </motion.div>

                    {/* Left Column: Contact Info & Map (Second in DOM -> Left side in RTL) */}
                    <div className="flex flex-col gap-8">
                        {/* Contact Info Card */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            dir="rtl"
                            className="bg-white rounded-[20px] p-10 shadow-sm border border-gray-100 flex flex-col gap-8 h-full"
                        >
                            <h2 className="text-2xl font-bold text-[var(--secondary-500)] mb-2" style={{ fontFamily: 'var(--font-khalid)' }}>
                                معلومات الإتصال
                            </h2>

                            <div className="flex flex-col gap-8">
                                {/* Location */}
                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col text-right">
                                        <span className="text-xl font-bold text-[var(--secondary-500)]">الموقع</span>
                                        <span className="text-[var(--muted-foreground)]">جامعة باب الزوار، الجزائر</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)] group-hover:scale-110 transition-transform">
                                        <MapPin size={24} />
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col text-right">
                                        <span className="text-xl font-bold text-[var(--secondary-500)]">البريد الإلكتروني</span>
                                        <span className="text-[var(--muted-foreground)]">contact@usthbmosque.com</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)] group-hover:scale-110 transition-transform">
                                        <Mail size={24} />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center justify-between group">
                                    <div className="flex flex-col text-right">
                                        <span className="text-xl font-bold text-[var(--secondary-500)]">الهاتف</span>
                                        <span className="text-[var(--muted-foreground)]">غير متوفر حاليا</span>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-[#0DE9C31A] flex items-center justify-center text-[var(--primary-1000)] group-hover:scale-110 transition-transform">
                                        <Phone size={24} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Map Image with Link */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className=" relative w-full h-full rounded-[20px] overflow-hidden shadow-sm border border-gray-100 bg-[#E8F2F8] group"
                        >
                            <a
                                href="https://maps.app.goo.gl/7gx8WRkPUnnHLiXg8"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full h-full relative"
                            >
                                <img
                                    src="/static/images/map.png"
                                    alt="Map Location"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://placehold.co/600x400/E8F2F8/10B981?text=Map+Location";
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <span className="bg-white/90 px-4 py-2 rounded-lg text-sm font-bold text-[var(--secondary-500)] opacity-0 group-hover:opacity-100 transition-opacity">
                                        عرض على الخرائط
                                    </span>
                                </div>
                            </a>
                        </motion.div>
                    </div>

                </div>
            </section>
        </ContactUsClient>
    );
};

export default ContactUsPage;
