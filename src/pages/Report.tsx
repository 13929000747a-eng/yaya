import React from 'react';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';

const Report: React.FC = () => {
    return (
        <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                style={{ marginTop: '2rem', width: '100%' }}
            >
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎉</div>
                <h1 style={{ color: 'var(--color-text)', marginBottom: '0.5rem' }}>定级完成!</h1>
                <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem' }}>你的当前水平预估为</p>

                <div style={{
                    background: 'linear-gradient(135deg, #FFB800 0%, #FF8C00 100%)',
                    padding: '2rem',
                    borderRadius: '50%',
                    width: '200px',
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 10px 30px rgba(255, 140, 0, 0.4)',
                    marginBottom: '3rem',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    <div style={{ fontSize: '1.2rem', opacity: 0.9 }}>Band</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: 'bold' }}>5.5+</div>
                </div>

                <div style={{
                    background: '#FFF',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-md)',
                    marginBottom: '2rem',
                    textAlign: 'left'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2rem', marginRight: '1rem' }}>🦆</span>
                        <strong style={{ fontSize: '1.1rem' }}>可达鸭的分析:</strong>
                    </div>
                    <p style={{ color: '#4A5568', lineHeight: '1.6' }}>
                        "你的发音很标准，听起来很舒服！<br />
                        但在长句子中稍微有点犹豫。<br />
                        只需要积累一点连接词，就能突破卡顿啦！"
                    </p>
                </div>

                <Button fullWidth onClick={() => alert('Start Full Training Demo')}>
                    开启正式训练 (Start Training)
                </Button>
            </motion.div>
        </div>
    );
};

export default Report;
