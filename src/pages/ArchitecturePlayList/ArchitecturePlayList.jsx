import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase.js'; // Импортируем и auth, и db
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import './ArchitecturePlayList.css';

export default function ArchitecturePlayList() {
  const [videoUrl, setVideoUrl] = useState('');
  const [modules, setModules] = useState([]);
  const [expandedModule, setExpandedModule] = useState(null);
  const [completedLessons, setCompletedLessons] = useState({});
  const [hasAccess, setHasAccess] = useState(false); // Состояние для отслеживания доступа
  const [loading, setLoading] = useState(true); // Состояние загрузки

  // Проверка роли пользователя и загрузка данных
  useEffect(() => {
    const checkUserRoleAndLoadData = async () => {
      const user = auth.currentUser;
      if (!user) {
        alert('Пожалуйста, войдите в систему.');
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'student') {
          alert('Доступ закрыт. Приобретите курс, чтобы получить доступ.');
          setLoading(false);
          return;
        }

        // Если роль "student", загружаем данные пользователя и модулей
        setHasAccess(true);

        // Загружаем completedLessons для пользователя
        const userData = userDoc.data();
        setCompletedLessons(userData.completedLessons || {});

        // Загружаем данные модулей
        const querySnapshot = await getDocs(collection(db, 'architecture-videos'));
        const modulesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          moduleTitle: doc.data().moduleTitle,
          links: doc.data().links || [],
        }));

        const sortedModules = modulesData.sort((a, b) => {
          const getModuleNumber = (title) => {
            const match = title.match(/Модуль (\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          };
          return getModuleNumber(a.moduleTitle) - getModuleNumber(b.moduleTitle);
        });

        setModules(sortedModules);
        if (sortedModules.length > 0 && sortedModules[0].links.length > 0) {
          setVideoUrl(sortedModules[0].links[0].videoUrl);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRoleAndLoadData();
  }, [auth, db]);

  const handleLessonClick = (videoUrl) => {
    setVideoUrl(videoUrl);
  };

  const toggleModule = (moduleIndex) => {
    setExpandedModule(expandedModule === moduleIndex ? null : moduleIndex);
  };

  const toggleLessonCompletion = async (moduleId, lessonIndex) => {
    const user = auth.currentUser;
    if (!user) return;

    setCompletedLessons((prev) => {
      const currentModuleLessons = prev[moduleId] || [];
      const newLessons = currentModuleLessons.includes(lessonIndex)
        ? currentModuleLessons.filter((index) => index !== lessonIndex)
        : [...currentModuleLessons, lessonIndex];

      // Обновляем данные в Firestore
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        completedLessons: {
          ...prev,
          [moduleId]: newLessons,
        },
      }).catch((error) => console.error('Ошибка при сохранении отметок:', error));

      return {
        ...prev,
        [moduleId]: newLessons,
      };
    });
  };

  const getCompletedCount = (moduleId, links) => {
    const completed = completedLessons[moduleId] || [];
    return {
      completed: completed.length,
      total: links.length,
    };
  };

  const getTotalDuration = (links) => {
    const totalMinutes = links.reduce((sum, lesson) => {
      const time = parseInt(lesson.videoTime, 10) || 0;
      return sum + (isNaN(time) ? 0 : time);
    }, 0);

    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours} ч ${minutes} мин`;
    }
    return `${totalMinutes} мин`;
  };

  // Рендерим компонент только после загрузки и проверки доступа
  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!hasAccess) {
    return <div>Доступ закрыт</div>; // Или можно вернуть пустой элемент или сообщение (например, <div>Доступ закрыт</div>)
  }

  return (
    <div className='playlist-container'>
      <div className='video-section'>
        {videoUrl ? (
          <iframe
            src={videoUrl}
            title='Course Video'
            width='100%'
            height='500px'
            frameBorder='0'
            allowFullScreen
          />
        ) : (
          <p>Выберите урок для просмотра</p>
        )}
      </div>
      <div className='modules-section'>
        {modules.map((module, index) => {
          const { completed, total } = getCompletedCount(module.id, module.links);
          const totalDuration = getTotalDuration(module.links);

          return (
            <div key={module.id} className='module'>
              <h3 onClick={() => toggleModule(index)} className='module-title'>
                {module.moduleTitle}
                <span className='completion-count'>
                  {' '}
                  {completed}/{total} | {totalDuration}
                </span>
                {expandedModule === index ? ' ▼' : ' ►'}
              </h3>
              {expandedModule === index && (
                <ul className='lessons-list'>
                  {module.links.map((lesson, lessonIndex) => {
                    const isCompleted = (completedLessons[module.id] || []).includes(lessonIndex);
                    return (
                      <li
                        key={lessonIndex}
                        onClick={() => handleLessonClick(lesson.videoUrl)}
                        className={`lesson ${isCompleted ? 'completed' : ''}`}>
                        <input
                          type='checkbox'
                          checked={isCompleted}
                          onChange={() => toggleLessonCompletion(module.id, lessonIndex)}
                        />
                        {lesson.title}
                        {lesson.videoTime && (
                          <span className='lesson-time'>{lesson.videoTime} мин</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
