
import React, { useState } from 'react';
import { db } from '../../config/firebase'; // Ensure this path is correct based on file location
import { collection, addDoc, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getSeasons } from '../../services/questionBankService';

const ImportTool: React.FC = () => {
    const [csvContent, setCsvContent] = useState('');
    const [status, setStatus] = useState<string>('Idle');
    const [seasons, setSeasons] = useState<any[]>([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [logs, setLogs] = useState<string[]>([]);

    React.useEffect(() => {
        getSeasons().then(setSeasons);
    }, []);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const [autoStatus, setAutoStatus] = useState('Idle');

    const CSV_DATA = `date,type,topic,question,answer,remark
20260104,new,Daily Rountine,What is your daily study routine?,"Well, my daily study routine is quite simple. In the morning, I usually get up around 9 o’clock and spend about an hour memorising English vocabulary, because that’s when I’m most concentrated. Then, from 10 to 11 o’clock, I do some IELTS reading and listening practice. In the afternoon, I usually spend some time working on speaking and writing. Yeah, that’s basically my daily study routine.",
20260104,new,Daily Rountine,Have you ever changed your routine?,"Well, yes, I’ve changed my routines many times. I mean, it really depends on the stage of the semester. At the beginning of the semester, I’m usually pretty laid-back, and my lifestyle is quite relaxed, so I don’t study as much. However, towards the end of the semester, my schedule becomes quite tight, and I normally study for around 10 to 12 hours a day.",
20260104,new,Daily Rountine,Do you think it is important to have a daily routine for your study?,"I would say yes, it’s very important, because I think it’s better to follow a regular pattern when I’m studying rather than doing random things here and there every day. In that way, learning is more effective. For example, if I want to study English really well, I’ll get up in the morning to memorise English words, then practise my reading and listening every day, and I’ll stick to that routine. I’m confident that in three months, my English will be much better. However, if I don’t have a routine, I don’t think things will work as well.",
20260104,new,Daily Rountine,What part of your day do you like best?,"I definitely like mornings best because, you know, in the morning everything still feels fresh. My mind is clear, and I find it’s the best time for concentration. However, when it comes to the afternoon and evening, there are just too many distractions and too many messages to reply, so I don’t think I can focus on my tasks as easily. That’s why I prefer mornings.",
20260104,new,Daily Rountine,Do you often go to bed late or early?,"Well, to be honest, I usually go to bed quite late, and that’s a really bad habit. I’m actually trying to go to bed before 10 o’clock. I think this is something that happens to a lot of people. You know, at night, before I go to sleep, I subconsciously start scrolling through social media feeds, and then I no longer feel sleepy at all. That’s why I usually stay up until around 1 or 2 o’clock every night, which is definitely not a good idea.",
20260104,oversea_new,Morning time,Do you like getting up early in the morning?,"Yeah, I really enjoy waking up early in the morning. You know, mornings are by far the most productive time of the day, so I try to get up as early as I can. If I don't, though, after lunch, I just start feeling a bit sluggish, and my level of focus tends to drop. That’s why I try to make the most of the morning when I feel at my best, so I can get more done before that afternoon slump hits.",
20260104,oversea_new,Morning time,What do you usually do in the morning?,"Well, my morning routine is very simple. Normally, I would get up around 7:00, then I would do a little bit of yoga, you know, just to stretch my body a little bit and prepare myself for the day. Then, it's time for breakfast. After breakfast, I would start my regular work on my computer. You know, I've got quite a few presentations and exams going on, so I would love to concentrate for about 3 to 4 hours before I have lunch. This is my usual morning routine.",
20260104,oversea_new,Morning time,What did you do in the morning when you were little? why?,"Well, when I was very young, my mornings were actually pretty hectic. I would normally get up around seven o’clock, and then do a bit of reading and memorising. A lot of that was for English — things like reciting passages and memorising vocabulary. That’s pretty typical for Chinese kids in the morning. Then, around eight or nine o’clock, we’d head to school. The morning schedule at school was quite tight as well.",
20260104,oversea_new,Morning time,Are there any differences between what you do in the morning now and what you did in the past?,"Yeah, I would say there is a huge difference, because in the past I was really just a student. About 99% of the things I did were related to finishing assignments or school projects. But now I’m mainly working, so in the mornings I’m usually very productive. I focus on my work projects, and that’s the main difference.",
20260104,oversea_new,Morning time,Do you spend your mornings doing the same things on both weekends and weekdays? Why?,"No, not really. I mean, on the weekends, I might just sleep in and be a bit of a couch potato in the mornings. But during the weekdays, I’m usually quite focused on my work or studies. I try to keep myself busy and productive from Monday to Friday. So yeah, I’d say I do totally different things on weekends compared with weekdays.",
20260104,must,study,Do you work or study?,"Well, I'm currently a student studying architecture at the University of Melbourne. I mean, ever since I was a kid I loved making models and drawing buildings, so I chose to study architecture when I had the chance to go to university.",
20260104,must,study,What subjects are you studying?,"As an architectural student, there are quite a few subjects that I study. I think the most important ones are the design studios, where we get to design buildings and make models. We also have a few other subjects about architecture history, art history, and construction management. These are the main subjects that I study.",
20260104,must,study,Do you like your subject?,"Yeah, I would say I love it very much.尽量表现积极人设 I think what I enjoy most about it is the opportunity we have to design a future for human beings. 具体点，到底喜欢它那科目/讨厌的话也具体点 I especially like parametric design because it really pushes our imagination to the next level. It's very inspiring for me to learn from architectural masters like Zaha Hadid and Rem Koolhaas, and to design a future and build towards it.",
20260104,must,study,Why did you choose to study that subject?,"Well, when I was a kid, I loved the buildings in fairy tales, and ever since I was in kindergarten, I enjoyed playing with building blocks. You know, I just had a passion for buildings. When I was slightly older, I found out that the subject is actually called architecture. I became really obsessed with the architectural designs in sci-fi movies, so I decided to choose it as my major.",
20260104,must,study,Do you think that your subject is popular in your country?,"Well, architecture used to be very popular in China because it is a rapidly growing developing country, and there was a lot of construction going on. However, in the recent two or three years, the birth rate has been decreasing dramatically, so the demand for housing projects has declined drastically. It's not as popular as before, and I think this trend is going to last for a long time.",
20260104,must,study,Do you have any plans for your studies in the next five years?,"No, I don’t think I will pursue any further studies, I mean, I will be getting my master’s degree and I have no intention of doing a PhD. So, I think my plan for the next five years will mainly focus on starting a career as an architect.",
20260104,must,work,What work do you do?,"Well, I work as an architect in Melbourne, Australia. The company I'm with mainly focuses on designing infrastructure, like train stations and bridges. I've been working here ever since I graduated from university, and I really enjoy my job.",
20260104,must,work,Why did you choose to do that type of work (or that job)?,"Well, ever since I was a kid, I loved playing with building blocks and making models, you know， I was very lucky to get a chance to attend architecture school, and when I graduated, I really felt I wanted to be an architect. So, I chose to work for an architectural firm instead of any other kind of design company.",
20260104,must,work,Do you like your job?,"Yes, 100%! It feels like a dream come true, you know, four years of hard work at univeristy has been paid off. I do this job because I like it and I love every single part of my job; I enjoy designing buildings and bridges, and I love rendering. 英文专业名词事先查好, 属于你的专业的I also enjoy working with my colleagues, specially those senior architects; I think they're my perfect role models, and that's what I wanna be in the future.",
20260104,must,work,Do you have any plans for your work in the next five years?,"Yes, my plan is to be ready to register as a qualified architect. It's a very important part of my career because right now I am working as a graduate, which means I am not yet registered. There is still a lot to learn in order to pass the exams, and it usually takes about five years for us. So, that’s my plan for the next five years.",
20260104,must,work,Do you want to change to another job?,"Well, I don't think I will change my job, but I might pick up another side hustle副业 that is related to my current job. Cause I work like 40 hours a week, I still have some time to pick up something else. I think I do want to have a teaching role in architectural school, but I don't know how it's going to happen. I'm preparing my portfolio for applications. So I will not change my job, and I think I'll pick up more jobs.",
20260104,must,work,Do you miss being a student?,"Sometimes, yes. I mean, I do miss how free I was when I was a student, you know. When I didn't have classes, I could do whatever I wanted, and I never had to worry about money. I miss that I didn't have to save up for my rent and bills. I mean, once you're working, you start to realize how hard it is to pay your bills and to, you know, live in a city where everything's very expensive.",
20260104,reserve,Borrowing/lending,Have you borrowed books from others?,"Yes, I borrowed plenty of books when I was younger. I remember that in primary school, we had a reading session where we had to borrow books from our classmates, and I also lent out a few of mine. They were mainly storybooks or children’s novels. But when I got older, I mostly borrowed books from the library rather than from friends. Most of those were related to my major.",
20260104,reserve,Borrowing/lending,Have you ever borrowed money from others?,"Yes, plenty of times—especially when I was in college. Back then, I used to love buying bubble tea after class. But sometimes I forgot to bring cash with me, so I’d borrow money from my classmates just to get bubble tea or other snacks. I haven’t borrowed money from anyone for many years now, because these days everyone uses digital payment. We just pay with our phones, so there’s really no need to borrow money anymore.",
20260104,reserve,Borrowing/lending,Do you like to lend things to others?,"Yes, I would love to. If someone comes to me and asks, “Can I borrow your book?” or “Can I borrow your dress or makeup?” I’m always happy to share. Especially dresses—you know, a lot of the time when my friends are going to parties or on dates, they come to me because they want to borrow one of my dresses. I’m always willing to lend them out, because I actually enjoy helping my friends dress up. Apart from that, I also lend books to others, since I have quite a large collection.",`;

    // Re-use logic for auto-import
    const handleAutoImport = async () => {
        setAutoStatus('Running...');
        setLogs([]);
        addLog("Starting Auto Import for 'Jan-Apr 2026'...");

        try {
            // 1. Find or Create Season
            let seasonId = seasons.find(s => s.title === 'Jan-Apr 2026')?.id;

            if (!seasonId) {
                addLog("Season not found. Creating 'Jan-Apr 2026'...");
                // Inline create logic to avoid dependency issues if needed, but we have createSeason script...
                // Actually we can just write to collection directly here
                const seasonRef = await addDoc(collection(db, 'question_seasons'), {
                    title: 'Jan-Apr 2026',
                    isActive: true,
                    createdAt: new Date() // Hack for timestamp
                });
                seasonId = seasonRef.id;
                addLog(`Created season: ${seasonId}`);
            } else {
                addLog(`Found existing season: ${seasonId}`);
            }

            // 2. Parse Data
            const lines = CSV_DATA.split('\n').filter(l => l.trim());

            const parseLine = (text: string) => {
                const result = [];
                let cell = '';
                let inQuotes = false;
                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(cell.trim());
                        cell = '';
                    } else {
                        cell += char;
                    }
                }
                result.push(cell.trim());
                return result;
            };

            const dataRows = lines.slice(1).map(parseLine);
            const topicsMap = new Map<string, string[]>();

            dataRows.forEach(row => {
                if (row.length < 4) return;
                const topicTitle = row[2];
                const questionText = row[3];
                if (!topicTitle || !questionText) return;
                if (!topicsMap.has(topicTitle)) topicsMap.set(topicTitle, []);
                topicsMap.get(topicTitle)?.push(questionText);
            });

            // 3. Write Data
            const batch = writeBatch(db);
            let count = 0;

            for (const [title, questions] of topicsMap) {
                const topicRef = doc(collection(db, 'question_topics'));
                batch.set(topicRef, {
                    seasonId,
                    title,
                    part: 1,
                    order: 0,
                    tags: ['Part 1']
                });
                count++;

                questions.forEach((q, idx) => {
                    const qRef = doc(collection(db, 'question_bank_questions'));
                    batch.set(qRef, {
                        topicId: topicRef.id,
                        text: q,
                        order: idx
                    });
                    count++;
                });
            }

            addLog(`Committing ${count} operations...`);
            await batch.commit();
            addLog("DONE! Success.");
            setAutoStatus('Success');

        } catch (error: any) {
            console.error(error);
            addLog(`Error: ${error.message}`);
            setAutoStatus('Error');
        }
    };

    const handleImport = async () => {
        if (!selectedSeason) {
            alert("Please select a season");
            return;
        }

        setStatus('Processing...');
        setLogs([]);
        addLog("Starting import...");

        const lines = csvContent.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',');

        // Simple CSV parser handling quotes
        const parseLine = (text: string) => {
            const result = [];
            let cell = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(cell.trim());
                    cell = '';
                } else {
                    cell += char;
                }
            }
            result.push(cell.trim());
            return result;
        };

        const dataRows = lines.slice(1).map(parseLine);

        // Group by Topic
        const topicsMap = new Map<string, string[]>(); // TopicTitle -> Questions

        dataRows.forEach(row => {
            // date,type,topic,question,answer,remark
            // Index: 0, 1, 2, 3, 4, 5
            if (row.length < 4) return;
            const topicTitle = row[2];
            const questionText = row[3];

            if (!topicTitle || !questionText) return;

            if (!topicsMap.has(topicTitle)) {
                topicsMap.set(topicTitle, []);
            }
            topicsMap.get(topicTitle)?.push(questionText);
        });

        addLog(`Found ${topicsMap.size} unique topics.`);

        try {
            const batch = writeBatch(db);
            let operationCount = 0;

            for (const [title, questions] of topicsMap) {
                // Check if topic exists in this season (to prevent duplicates if run multiple times)
                // For simplicity in this tool, we'll verify duplicates by title within the season
                // Ideally we should do a read first.

                // 1. Create Topic
                const topicRef = doc(collection(db, 'question_topics'));
                batch.set(topicRef, {
                    seasonId: selectedSeason,
                    title: title,
                    part: 1, // Assumption: Importing Part 1
                    order: 0,
                    tags: ['Imported']
                });
                operationCount++;

                // 2. Create Questions
                questions.forEach((qText, idx) => {
                    const qRef = doc(collection(db, 'question_bank_questions'));
                    batch.set(qRef, {
                        topicId: topicRef.id,
                        text: qText,
                        order: idx
                    });
                    operationCount++;
                });

                addLog(`Prepared topic: ${title} with ${questions.length} questions.`);
            }

            if (operationCount > 500) {
                addLog("Warning: Batch size > 500. Firestore limit is 500. This might fail if too large. Please split.");
                // For this demo, assuming it fits or we'll handle partials later.
                // The sample CSV is small enough.
            }

            await batch.commit();
            addLog("Batch committed successfully!");
            setStatus("Success");

        } catch (e: any) {
            console.error(e);
            addLog(`Error: ${e.message}`);
            setStatus("Error");
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Import Tool (Part 1)</h1>

            <div style={{ border: '2px solid #6366f1', padding: '1rem', marginBottom: '2rem', borderRadius: '8px', background: '#e0e7ff' }}>
                <h3>🚀 Fast Track</h3>
                <p>Import the standard "1-4 month 2026" Part 1 questions automatically.</p>
                <button
                    onClick={handleAutoImport}
                    disabled={autoStatus === 'Running'}
                    style={{ padding: '10px 20px', fontSize: '1.2rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {autoStatus === 'Running' ? 'Working...' : 'One-Click Import'}
                </button>
                {autoStatus === 'Success' && <span style={{ marginLeft: '1rem', color: 'green', fontWeight: 'bold' }}>✅ Import Complete!</span>}
            </div>

            <hr />
            <h3>Manual Import</h3>
            <div style={{ marginBottom: '1rem' }}>
                <label>Target Season: </label>
                <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
                    <option value="">Select...</option>
                    {seasons.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                </select>
            </div>

            <textarea
                rows={10}
                style={{ width: '100%', marginBottom: '1rem' }}
                placeholder="Paste CSV content here..."
                value={csvContent}
                onChange={e => setCsvContent(e.target.value)}
            />

            <button onClick={handleImport} disabled={status === 'Processing...'}>
                {status === 'Processing...' ? 'Importing...' : 'Parse & Import'}
            </button>

            <div style={{ marginTop: '1rem', background: '#f5f5f5', padding: '1rem' }}>
                <h3>Logs:</h3>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
        </div>
    );
};

export default ImportTool;
