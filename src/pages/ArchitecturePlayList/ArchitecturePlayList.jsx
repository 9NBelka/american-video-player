import React, { useState, useEffect } from 'react';
import { db } from '../../firebase.js'; // Импортируем Firestore
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'; // Добавляем функции Firestore
import './ArchitecturePlayList.css'; // Подключаем стили

export default function ArchitecturePlayList() {
  const [videoUrl, setVideoUrl] = useState(''); // Состояние для текущего видео (ссылка для iframe)
  const [modules, setModules] = useState([]); // Состояние для данных из Firebase
  const [expandedModule, setExpandedModule] = useState(null); // Для управления раскрытием модулей
  const [completedLessons, setCompletedLessons] = useState({}); // Состояние для отслеживания просмотренных уроков (ключ — ID модуля, значение — массив индексов уроков)

  // Загрузка данных из Firestore при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'architecture-videos')); // Используем коллекцию architecture-videos
        const modulesData = querySnapshot.docs.map((doc) => ({
          id: doc.id, // Сохраняем ID документа
          moduleTitle: doc.data().moduleTitle, // Название модуля
          links: doc.data().links || [], // Массив уроков с title, videoUrl и videoTime
        }));

        // Сортировка модулей по числу в начале moduleTitle (например, "Модуль 1 - input" -> 1)
        const sortedModules = modulesData.sort((a, b) => {
          const getModuleNumber = (title) => {
            const match = title.match(/Модуль (\d+)/); // Извлекаем число после "Модуль"
            return match ? parseInt(match[1], 10) : 0; // Если числа нет, возвращаем 0
          };
          return getModuleNumber(a.moduleTitle) - getModuleNumber(b.moduleTitle);
        });

        setModules(sortedModules);
        // Устанавливаем первое видео по умолчанию (если есть)
        if (sortedModules.length > 0 && sortedModules[0].links.length > 0) {
          setVideoUrl(sortedModules[0].links[0].videoUrl); // Устанавливаем первую ссылку как начальное видео
        }

        // Загружаем состояние просмотренных уроков (можно добавить чтение из Firestore, если сохраняем там)
        // Пока просто инициализируем пустым объектом
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };
    fetchData();
  }, [db]);

  // Обработчик клика по уроку (ссылке)
  const handleLessonClick = (videoUrl) => {
    setVideoUrl(videoUrl);
  };

  // Обработчик для разворачивания/сворачивания модулей
  const toggleModule = (moduleIndex) => {
    setExpandedModule(expandedModule === moduleIndex ? null : moduleIndex);
  };

  // Обработчик отметки урока как просмотренного
  const toggleLessonCompletion = async (moduleId, lessonIndex) => {
    setCompletedLessons((prev) => {
      const currentModuleLessons = prev[moduleId] || [];
      const newLessons = currentModuleLessons.includes(lessonIndex)
        ? currentModuleLessons.filter((index) => index !== lessonIndex) // Убираем, если уже отмечено
        : [...currentModuleLessons, lessonIndex]; // Добавляем, если не отмечено

      // Сохраняем в Firestore (опционально, если нужно сохранять состояние)
      const moduleRef = doc(db, 'architecture-videos', moduleId);
      updateDoc(moduleRef, {
        completedLessons: newLessons, // Сохраняем индексы просмотренных уроков в документе модуля
      }).catch((error) => console.error('Ошибка при сохранении:', error));

      return {
        ...prev,
        [moduleId]: newLessons,
      };
    });
  };

  // Подсчет просмотренных уроков в модуле
  const getCompletedCount = (moduleId, links) => {
    const completed = completedLessons[moduleId] || [];
    return {
      completed: completed.length,
      total: links.length,
    };
  };

  // Подсчет общего времени модуля
  const getTotalDuration = (links) => {
    const totalMinutes = links.reduce((sum, lesson) => {
      // Предполагаем, что videoTime — это строка или число в минутах (например, "10" или 10)
      const time = parseInt(lesson.videoTime, 10) || 0; // Преобразуем в число, если не указано, считаем 0
      return sum + (isNaN(time) ? 0 : time); // Исключаем NaN
    }, 0);

    // Форматируем общее время (например, "58 мин" или "1 ч 30 мин")
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours} ч ${minutes} мин`;
    }
    return `${totalMinutes} мин`;
  };

  return (
    <div className='playlist-container'>
      {/* Левая часть — видео */}
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

      {/* Правая часть — список модулей и уроков */}
      <div className='modules-section'>
        {modules.map((module, index) => {
          const { completed, total } = getCompletedCount(module.id, module.links);
          const totalDuration = getTotalDuration(module.links);

          return (
            <div key={module.id} className='module'>
              <h3 onClick={() => toggleModule(index)} className='module-title'>
                {module.moduleTitle} {/* Название модуля */}
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
                        onClick={() => handleLessonClick(lesson.videoUrl)} // Клик по ссылке меняет видео
                        className={`lesson ${isCompleted ? 'completed' : ''}`}>
                        <input
                          type='checkbox'
                          checked={isCompleted}
                          onChange={() => toggleLessonCompletion(module.id, lessonIndex)}
                        />
                        {lesson.title} {/* Отображаем название урока */}
                        {lesson.videoTime && (
                          <span className='lesson-time'>{lesson.videoTime} мин</span>
                        )}
                        {/* Отображаем время урока */}
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
