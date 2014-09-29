package com.secmem.mvrw.controller;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Component;

/**
 * @author Francis, 박광열
 * 
 */
@Aspect
@Component
public class ControllerAspect {

	private static Logger logger = LoggerFactory
			.getLogger(ControllerAspect.class);

	@Around("bean(*Controller)")
	public Object trace(ProceedingJoinPoint joinPoint) throws Throwable {
		String signatureString = joinPoint.getSignature().toShortString();
		logger.debug("start : " + signatureString);
		long start = System.currentTimeMillis();

		try {
			return joinPoint.proceed();
		} finally {
			long finish = System.currentTimeMillis();
			logger.debug("end : " + signatureString);
			logger.debug("time : " + signatureString + (finish - start) + "ms");
		}
	}

}
